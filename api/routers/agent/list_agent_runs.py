"""GET /agent-runs"""

from typing import List

from fastapi import APIRouter

from ...services.ai import runtime

router = APIRouter(prefix="/agent-runs", tags=["agent-runs"])


@router.get("")
def list_agent_runs():
    """List active and recent agent runs."""
    return runtime.list()
