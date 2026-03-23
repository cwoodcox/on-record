"""OpenAI provider for the eval harness agentic loop."""

import json

import openai
from deepeval.test_case import MCPToolCall, Turn
from mcp.types import CallToolResult, TextContent

from mcp_client import McpHttpClient
from providers.base import LLMProvider


class OpenAIProvider(LLMProvider):
    """LLM provider using the OpenAI Chat Completions API.

    Uses ``{"role": "system", ...}`` as the first message for system prompt
    placement (OpenAI convention). Tool schemas are transformed from canonical
    (Anthropic-like) format to OpenAI's function calling format at init time.
    """

    def __init__(self, model: str, system_prompt: str, tool_schemas: list[dict]) -> None:
        super().__init__(model, system_prompt, tool_schemas)
        self._client = openai.OpenAI()
        # Transform canonical tool schemas to OpenAI function calling format
        self._openai_tools = [
            {
                "type": "function",
                "function": {
                    "name": s["name"],
                    "description": s["description"],
                    "parameters": s["input_schema"],
                },
            }
            for s in tool_schemas
        ]

    async def run_agentic_loop(
        self,
        filtered_turns: list[Turn],
        current_input: str,
        mcp_client: McpHttpClient,
    ) -> tuple[str, list[MCPToolCall]]:
        """Run the OpenAI agentic loop with tool proxying.

        Converts turns to OpenAI message format (system prompt as first message),
        then loops calling the Chat Completions API until the model produces a
        final response (finish_reason == "stop").
        """
        # Build OpenAI-format messages: system prompt first, then history + current input
        all_turns = list(filtered_turns) + [Turn(role="user", content=current_input)]
        messages: list[dict] = [{"role": "system", "content": self.system_prompt}]
        messages.extend({"role": t.role, "content": t.content} for t in all_turns)

        mcp_calls: list[MCPToolCall] = []

        while True:
            response = self._client.chat.completions.create(
                model=self.model,
                messages=messages,
                tools=self._openai_tools,
                max_tokens=2048,
            )

            choice = response.choices[0]

            if choice.finish_reason == "stop":
                final_text = choice.message.content or ""
                break

            # Process tool calls (OpenAI may return multiple in parallel)
            if choice.message.tool_calls:
                # Append the assistant message with tool_calls to conversation
                messages.append(choice.message)

                for tool_call in choice.message.tool_calls:
                    # Parse arguments — OpenAI returns a JSON string
                    try:
                        args = json.loads(tool_call.function.arguments)
                    except (json.JSONDecodeError, TypeError) as exc:
                        # Surface parse failure as error tool result so the LLM can recover
                        result_text = f"Tool error: failed to parse arguments: {exc}"
                        is_error = True
                        args = {}
                    else:
                        is_error = False
                        try:
                            result = await mcp_client.call_tool(
                                tool_call.function.name, args
                            )
                            result_text = str(result)
                        except Exception as exc:
                            result_text = f"Tool error: {exc}"
                            is_error = True

                    call_tool_result = CallToolResult(
                        content=[TextContent(type="text", text=result_text)],
                        isError=is_error,
                    )
                    mcp_calls.append(
                        MCPToolCall(
                            name=tool_call.function.name,
                            args=args,
                            result=call_tool_result,
                        )
                    )
                    # Each tool result is a separate message with the tool_call_id
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": result_text,
                    })
            else:
                # No tool calls and not "stop" — treat as final response
                final_text = choice.message.content or ""
                break

        return final_text, mcp_calls
