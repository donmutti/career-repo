"""GET /agent-runs/{run_id}"""

from fastapi import APIRouter, HTTPException

from ...db import AgentRunDAO
from ...models.entities import AgentRun

router = APIRouter(prefix="/agent-runs", tags=["agent-runs"])

agent_run_dao = AgentRunDAO()


@router.get("/{run_id}", response_model=AgentRun)
def get_agent_run(run_id: str):
    """Get agent run metadata and latest status."""
    run = agent_run_dao.get(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="AgentRun not found")
    return run
