"""AgentRunRecord, AgentRunStatus, and InMemoryAgentRunStore."""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional


class AgentRunStatus(Enum):
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class AgentRunRecord:
    """Minimal run record — lives in memory only."""
    id: str
    agent: str
    status: AgentRunStatus
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    external_id: Optional[str] = None
    output: Optional[str] = None
    completed_at: Optional[datetime] = None
    meta: Optional[Dict[str, Any]] = None


class InMemoryAgentRunStore:
    """In-memory store for agent run records. No persistence — runs are lost on restart."""

    def __init__(self) -> None:
        self._records: Dict[str, AgentRunRecord] = {}

    def create(self, agent: str, external_id: Optional[str] = None) -> AgentRunRecord:
        import uuid
        record = AgentRunRecord(id=str(uuid.uuid4()), agent=agent, external_id=external_id, status=AgentRunStatus.RUNNING)
        self._records[record.id] = record
        return record

    def get(self, run_id: str) -> Optional[AgentRunRecord]:
        return self._records.get(run_id)

    def list(self) -> List[AgentRunRecord]:
        return sorted(self._records.values(), key=lambda r: r.created_at, reverse=True)

    def list_active(self) -> List[AgentRunRecord]:
        return [r for r in self.list() if r.status == AgentRunStatus.RUNNING]

    def list_active_by_agent_name(self, agent: str) -> List[AgentRunRecord]:
        return [r for r in self.list_active() if r.agent == agent]

    def list_active_by_external_id(self, external_id: str) -> List[AgentRunRecord]:
        return [r for r in self.list_active() if r.external_id == external_id]

    def complete(self, run_id: str, output: str) -> None:
        record = self._records.get(run_id)
        if record:
            record.status = AgentRunStatus.COMPLETED
            record.output = output
            record.completed_at = datetime.now(timezone.utc)

    def fail(self, run_id: str, output: str) -> None:
        record = self._records.get(run_id)
        if record:
            record.status = AgentRunStatus.FAILED
            record.output = output
            record.completed_at = datetime.now(timezone.utc)

    def cancel(self, run_id: str) -> None:
        record = self._records.get(run_id)
        if record:
            record.status = AgentRunStatus.CANCELLED
            record.completed_at = datetime.now(timezone.utc)

    def set_meta(self, run_id: str, meta: dict) -> None:
        record = self._records.get(run_id)
        if record:
            record.meta = meta
