"""GET /agent-runs"""

from typing import List

from fastapi import APIRouter

from ...db import AgentRunDAO
from ...models.entities import AgentRun

router = APIRouter(prefix="/agent-runs", tags=["agent-runs"])

agent_run_dao = AgentRunDAO()


@router.get("", response_model=List[AgentRun])
def list_agent_runs():
    """List active and recent agent runs."""
    return agent_run_dao.list()
