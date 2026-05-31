"""POST /agent-runs"""

from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ...db import AgentRunDAO
from ...services.ai import ClaudeError, claude

_COMMANDS_DIR = Path(__file__).parent.parent.parent / "services" / "ai" / "commands"

router = APIRouter(prefix="/agent-runs", tags=["agent-runs"])

agent_run_dao = AgentRunDAO()


class CreateAgentRunRequestDto(BaseModel):
    agent: str
    opportunity_id: Optional[str] = None
    payload: Optional[dict] = None


@router.post("")
async def create_agent_run(request: CreateAgentRunRequestDto):
    """Start a new agent run and stream output as Server-Sent Events."""
    command_file = _COMMANDS_DIR / f"{request.agent}.md"
    if not command_file.exists():
        raise HTTPException(status_code=400, detail=f"Unknown agent: {request.agent}")

    payload = request.payload or {}

    async def stream():
        try:
            async for event in claude.stream_to_client(command_file, payload, request.opportunity_id):
                yield f"data: {event.model_dump_json()}\n\n"
        except ClaudeError as e:
            from ...services.ai import StreamEvent
            error_event = StreamEvent(type="error", data={"message": str(e)})
            yield f"data: {error_event.model_dump_json()}\n\n"

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
