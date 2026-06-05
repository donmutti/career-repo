"""ClaudeAgentSDK — concrete AgentSDK implementation wrapping claude_agent_sdk."""

from typing import AsyncIterator

from agent_runtime.agent_sdk import (
    AgentSDKOptions,
    AgentSdkAssistantMessage,
    AgentSdkMessage,
    AgentSdkResultMessage,
    AgentSdkTextBlock,
    AgentSdkToolUseBlock,
)


class ClaudeAgentSDK:
    """Adapter that wraps claude_agent_sdk and satisfies the AgentSDK protocol."""

    async def query(
        self,
        prompt: str,
        system: str,
        tools: list,
        options: AgentSDKOptions,
    ) -> AsyncIterator[AgentSdkMessage]:
        import claude_agent_sdk

        sdk_options = claude_agent_sdk.ClaudeAgentOptions(
            system_prompt=system,
            allowed_tools=tools,
            permission_mode=options.permission_mode,
            max_turns=options.max_turns,
        )
        async for message in claude_agent_sdk.query(prompt=prompt, options=sdk_options):
            if hasattr(message, "content"):
                model = getattr(message, "model", "") or ""
                content = []
                for block in (message.content or []):
                    if hasattr(block, "text"):
                        content.append(AgentSdkTextBlock(text=block.text))
                    elif hasattr(block, "name") and hasattr(block, "input"):
                        content.append(AgentSdkToolUseBlock(name=block.name, input=block.input))
                yield AgentSdkAssistantMessage(model=model, content=content)
            elif hasattr(message, "total_cost_usd"):
                yield AgentSdkResultMessage(total_cost_usd=message.total_cost_usd or 0.0)
