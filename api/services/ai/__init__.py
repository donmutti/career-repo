"""AI services."""

from .claude_service import ClaudeService, ClaudeError, ClaudeResult, AgentRunHandle, StreamEvent
from .embedding_service import EmbeddingService
from api.db import AgentRunDAO as _AgentRunDAO

claude = ClaudeService(_AgentRunDAO())
embedding = EmbeddingService()

__all__ = ["ClaudeService", "ClaudeError", "ClaudeResult", "AgentRunHandle", "StreamEvent", "claude", "EmbeddingService", "embedding"]
