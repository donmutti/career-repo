"""DELETE /agent-runs/{run_id}"""

from fastapi import APIRouter, HTTPException

from ...db import AgentRunDAO, OpportunityDAO
from ...services.ai import runtime

router = APIRouter(prefix="/agent-runs", tags=["agent-runs"])

agent_run_dao = AgentRunDAO()
opp_dao = OpportunityDAO()


@router.delete("/{run_id}", status_code=204)
async def cancel_agent_run(run_id: str):
    """Cancel an active agent run by aborting its in-flight SDK request."""
    run = agent_run_dao.get(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="AgentRun not found")

    if run.status == "running":
        await runtime.cancel(run_id)
        agent_run_dao.cancel(run_id)
        # Stamp sourcing_completed_at if this run was a sourcing run
        if run.external_id:
            opp = opp_dao.get(run.external_id)
            if opp and opp.sourcing_agent_run_id == run_id and opp.sourcing_completed_at is None:
                opp_dao.set_sourcing_completed(run.external_id)
