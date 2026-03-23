"""Anthropic Claude provider for the eval harness agentic loop."""

from typing import cast

import anthropic
from anthropic.types import ToolParam
from deepeval.test_case import MCPToolCall, Turn
from mcp.types import CallToolResult, TextContent

from mcp_client import McpHttpClient
from providers.base import LLMProvider


def _extract_tool_result_text(result: object) -> str:
    """Extract text from an MCPToolCall result, handling both CallToolResult and str."""
    if isinstance(result, CallToolResult):
        for block in result.content:
            if isinstance(block, TextContent):
                return block.text
        return str(result)
    return str(result)


class AnthropicProvider(LLMProvider):
    """LLM provider using the Anthropic Claude API.

    Extracted from the original hardcoded implementation in chatbot.py.
    Uses the ``system`` kwarg for system prompt placement (Anthropic convention).
    Tool schemas are passed through as-is since the canonical format matches
    Anthropic's native format.
    """

    def __init__(self, model: str, system_prompt: str, tool_schemas: list[dict]) -> None:
        super().__init__(model, system_prompt, tool_schemas)
        self._client = anthropic.Anthropic()
        self._tools: list[ToolParam] = cast(list[ToolParam], tool_schemas)

    async def run_agentic_loop(
        self,
        filtered_turns: list[Turn],
        current_input: str,
        mcp_client: McpHttpClient,
    ) -> tuple[str, list[MCPToolCall]]:
        """Run the Anthropic agentic loop with tool proxying.

        Converts turns to Anthropic message format, then loops calling the Claude
        API until a final text response (stop_reason == "end_turn") is produced.
        """
        # Build Anthropic-format messages from filtered turns + current input
        messages: list[dict] = []
        for t in filtered_turns:
            if t.role == "assistant" and t.mcp_tools_called:
                # Reconstruct tool use/result messages from history
                messages.append({"role": "assistant", "content": [
                    {"type": "tool_use", "id": f"call_{i}", "name": call.name, "input": call.args}
                    for i, call in enumerate(t.mcp_tools_called)
                ]})
                messages.append({"role": "user", "content": [
                    {"type": "tool_result", "tool_use_id": f"call_{i}",
                     "content": _extract_tool_result_text(call.result)}
                    for i, call in enumerate(t.mcp_tools_called)
                ]})
                if t.content:
                    messages.append({"role": "assistant", "content": t.content})
            else:
                messages.append({"role": t.role, "content": t.content})

        messages.append({"role": "user", "content": current_input})

        mcp_calls: list[MCPToolCall] = []

        while True:
            response = self._client.messages.create(
                model=self.model,
                system=self.system_prompt,
                messages=messages,
                tools=self._tools,
                max_tokens=2048,
            )

            if response.stop_reason == "end_turn":
                final_text = next(
                    (b.text for b in response.content if b.type == "text"), ""
                )
                break

            # Process ALL tool_use blocks in this response before re-querying Claude.
            tool_result_blocks: list[dict] = []
            for block in response.content:
                if block.type == "tool_use":
                    is_error = False
                    try:
                        result = await mcp_client.call_tool(block.name, block.input)
                        result_text = result
                    except Exception as exc:
                        result_text = f"Tool error: {exc}"
                        is_error = True

                    call_tool_result = CallToolResult(
                        content=[TextContent(type="text", text=result_text)],
                        isError=is_error,
                    )
                    mcp_calls.append(
                        MCPToolCall(
                            name=block.name,
                            args=block.input,
                            result=call_tool_result,
                        )
                    )
                    tool_result_blocks.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result_text,
                    })

            if tool_result_blocks:
                messages.append({"role": "assistant", "content": response.content})
                messages.append({"role": "user", "content": tool_result_blocks})

        return final_text, mcp_calls
