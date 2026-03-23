"""Abstract base class defining the LLM provider contract for the eval harness."""

from deepeval.test_case import MCPToolCall, Turn

from mcp_client import McpHttpClient


class LLMProvider:
    """Base class for LLM providers used by model_callback's agentic loop.

    Subclasses must implement ``run_agentic_loop`` which handles:
    - Converting DeepEval Turn history to provider-native message format
    - Calling the LLM API
    - Parsing tool_use / function_call responses
    - Proxying tool calls through the MCP client
    - Looping until the LLM produces a final text response

    Args:
        model: Model identifier (e.g. ``"gpt-4.1"``, ``"claude-sonnet-4-6"``).
        system_prompt: System prompt text injected into each conversation.
        tool_schemas: Canonical tool schemas (Anthropic-like format with
            ``name``, ``description``, ``input_schema`` keys).
    """

    def __init__(self, model: str, system_prompt: str, tool_schemas: list[dict]) -> None:
        self.model = model
        self.system_prompt = system_prompt
        self.tool_schemas = tool_schemas

    async def run_agentic_loop(
        self,
        filtered_turns: list[Turn],
        current_input: str,
        mcp_client: McpHttpClient,
    ) -> tuple[str, list[MCPToolCall]]:
        """Run the agentic loop: LLM calls + tool proxying until a final text response.

        Args:
            filtered_turns: Conversation history (already filtered for consecutive
                same-role turns), NOT including ``current_input``.
            current_input: The latest user message.
            mcp_client: MCP HTTP client for proxying tool calls.

        Returns:
            A tuple of ``(final_text, mcp_calls)`` where ``final_text`` is the
            assistant's final response and ``mcp_calls`` is the list of all MCP
            tool calls made during the loop.
        """
        raise NotImplementedError("Subclasses must implement run_agentic_loop")
