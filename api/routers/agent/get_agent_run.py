"""GET /agent-runs/{run_id}"""

from fastapi import APIRouter, HTTPException

from ...services.ai import runtime

router = APIRouter(prefix="/agent-runs", tags=["agent-runs"])


@router.get("/{run_id}")
def get_agent_run(run_id: str):
    """Get agent run metadata and latest status."""
    run = runtime.get(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="AgentRun not found")
    return run
