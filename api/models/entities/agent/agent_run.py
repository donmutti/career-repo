"""Agent run entity."""

from datetime import datetime
from typing import Any, Dict, Optional

from agent_runtime import AgentRunStatus
from ..base import BaseEntity


class AgentRun(BaseEntity):
    """A single execution of a Claude agent command."""

    agent: str
    status: AgentRunStatus
    external_id: Optional[str] = None
    output: Optional[str] = None
    completed_at: Optional[datetime] = None
    meta: Optional[Dict[str, Any]] = None
