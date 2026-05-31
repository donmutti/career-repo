"""Agent run entity."""

from datetime import datetime
from typing import Any, Dict, Optional

from ..base import BaseEntity


class AgentRun(BaseEntity):
    """A single execution of a Claude agent command."""

    agent: str
    status: str
    opportunity_id: Optional[str] = None
    output: Optional[str] = None
    completed_at: Optional[datetime] = None
    meta: Optional[Dict[str, Any]] = None
