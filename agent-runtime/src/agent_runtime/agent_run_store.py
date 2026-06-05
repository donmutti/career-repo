"""AgentRunRecord and AgentRunStore — the persistence contract."""

from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Protocol


class AgentRunStatus(Enum):
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class AgentRunRecord:
    """Minimal run record — persisted by AgentRunStore."""
    id: str
    agent: str
    status: AgentRunStatus
    external_id: Optional[str] = None
    output: Optional[str] = None
    completed_at: Optional[datetime] = None
    meta: Optional[Dict[str, Any]] = None


class AgentRunStore(Protocol):
    def get(self, run_id: str) -> Optional[AgentRunRecord]: ...

    def list_active(self) -> List[AgentRunRecord]: ...

    def list_active_by_external_id(self, external_id: str) -> List[AgentRunRecord]: ...

    def create(self, agent: str, external_id: Optional[str] = None) -> AgentRunRecord: ...

    def complete(self, run_id: str, output: str) -> None: ...

    def fail(self, run_id: str, output: str) -> None: ...

    def cancel(self, run_id: str) -> None: ...

    def set_meta(self, run_id: str, meta: dict) -> None: ...
