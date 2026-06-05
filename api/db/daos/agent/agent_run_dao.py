"""Agent Run DAO."""

import json
from typing import Any, Dict, List, Optional

from agent_runtime import AgentRunStatus
from api.models.entities import AgentRun
from ..base import BaseEntityDAO


class AgentRunDAO(BaseEntityDAO[AgentRun]):

    def create(self, agent: str, external_id: Optional[str] = None) -> AgentRun:
        """Create a new agent run record in running state."""
        run_id = self._generate_id()
        now = self._now()
        self._execute(
            "insert into agent_run (id, agent, status, opportunity_id, created_at) values (?, ?, ?, ?, ?)",
            (run_id, agent, "running", external_id, now.isoformat()),
        )
        self._save()
        return self.get(run_id)

    def get(self, run_id: str) -> Optional[AgentRun]:
        """Get an agent run by ID."""
        cursor = self._execute("select * from agent_run where id = ?", (run_id,))
        row = cursor.fetchone()
        return self._from_dict(dict(row)) if row else None

    def list(self) -> List[AgentRun]:
        """List all agent runs, newest first."""
        cursor = self._execute("select * from agent_run order by created_at desc")
        return [self._from_dict(dict(row)) for row in cursor.fetchall()]

    def list_active(self) -> List[AgentRun]:
        """List runs currently in running state."""
        cursor = self._execute(
            "select * from agent_run where status = 'running' order by created_at desc",
        )
        return [self._from_dict(dict(row)) for row in cursor.fetchall()]

    def list_active_by_external_id(self, external_id: str) -> List[AgentRun]:
        """List active runs for a specific external ID."""
        cursor = self._execute(
            "select * from agent_run where status = 'running' and opportunity_id = ? order by created_at desc",
            (external_id,),
        )
        return [self._from_dict(dict(row)) for row in cursor.fetchall()]

    def complete(self, run_id: str, output: str) -> None:
        """Mark run as completed with accumulated output."""
        now = self._now()
        self._execute(
            "update agent_run set status = 'completed', output = ?, completed_at = ? where id = ?",
            (output, now.isoformat(), run_id),
        )
        self._save()

    def cancel(self, run_id: str) -> None:
        """Mark run as cancelled."""
        now = self._now()
        self._execute(
            "update agent_run set status = 'cancelled', completed_at = ? where id = ?",
            (now.isoformat(), run_id),
        )
        self._save()

    def fail(self, run_id: str, output: str) -> None:
        """Mark run as failed with any accumulated output."""
        now = self._now()
        self._execute(
            "update agent_run set status = 'failed', output = ?, completed_at = ? where id = ?",
            (output, now.isoformat(), run_id),
        )
        self._save()

    def set_meta(self, run_id: str, meta: Dict[str, Any]) -> None:
        """Update the meta field for a run."""
        self._execute(
            "update agent_run set meta = ? where id = ?",
            (json.dumps(meta), run_id),
        )
        self._save()

    def delete(self, run_id: str) -> None:
        """Hard-delete an agent run record."""
        self._execute("delete from agent_run where id = ?", (run_id,))
        self._save()

    def _from_dict(self, row: dict) -> AgentRun:
        raw_meta = row.get("meta")
        return AgentRun(
            id=row["id"],
            created_at=row["created_at"],
            agent=row["agent"],
            status=AgentRunStatus(row["status"]),
            external_id=row.get("opportunity_id"),
            output=row.get("output"),
            completed_at=row.get("completed_at"),
            meta=json.loads(raw_meta) if raw_meta else None,
        )
