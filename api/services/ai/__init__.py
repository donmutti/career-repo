"""AI services."""

from pathlib import Path

from agent_runtime import AgentRunError, AgentRun, AgentRunEvent, AgentRunEventType, AgentRuntime, ClaudeAgentSDK
from .agents import Agent
from .embedding_service import EmbeddingService
from api.db import AgentRunDAO as _AgentRunDAO

_PROMPTS_DIR = Path(__file__).parent / "agents"

_TOOL_ALLOWLIST = {
    "inbox-preflight.md": ["mcp__gmail__*"],
    "scan-inbox.md": ["mcp__gmail__*"],
    "extract-opportunity-from-email.md": [],
    "source-opportunity.md": ["WebFetch"],
    "generate-attachment.md": [],
    "parse-work-experience-from-resume.md": [],
}

runtime = AgentRuntime(sdk=ClaudeAgentSDK(), store=_AgentRunDAO(), prompts_dir=_PROMPTS_DIR, tool_allowlist=_TOOL_ALLOWLIST)
embedding = EmbeddingService()

__all__ = [
    "Agent",
    "AgentRunError",
    "AgentRun",
    "AgentRunEvent",
    "AgentRunEventType",
    "EmbeddingService",
    "runtime",
    "embedding",
]
