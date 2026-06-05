"""AI services."""

from pathlib import Path

from agent_runtime import AgentRunError, AgentRun, AgentRunEvent, AgentRunEventType, AgentRuntime, ClaudeAgentSDK
from .agents import AgentName
from .embedding_service import EmbeddingService

_PROMPTS_DIR = Path(__file__).parent / "agents"

_TOOL_ALLOWLIST = {
    "inbox-preflight.md": ["mcp__gmail__*"],
    "scan-inbox.md": ["mcp__gmail__*"],
    "extract-opportunity-from-email.md": [],
    "source-opportunity.md": ["WebFetch"],
    "generate-attachment.md": [],
    "parse-work-experience-from-resume.md": [],
}

runtime = AgentRuntime(sdk=ClaudeAgentSDK(), prompts_dir=_PROMPTS_DIR, tool_allowlist=_TOOL_ALLOWLIST)
embedding = EmbeddingService()

__all__ = [
    "AgentName",
    "AgentRunError",
    "AgentRun",
    "AgentRunEvent",
    "AgentRunEventType",
    "EmbeddingService",
    "runtime",
    "embedding",
]
