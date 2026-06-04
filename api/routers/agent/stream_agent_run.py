"""POST /agent-runs"""

from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ...services.ai import ClaudeError, StreamEvent, claude

router = APIRouter(prefix="/agent-runs", tags=["agent-runs"])


class CreateAgentRunRequestDto(BaseModel):
    agent: str
    opportunity_id: Optional[str] = None
    payload: Optional[dict] = None


@router.post("")
async def create_agent_run(request: CreateAgentRunRequestDto):
    """Start a new agent run and stream output as Server-Sent Events."""
    async def stream():
        try:
            async for event in claude.generate_stream(request.agent, request.payload or {}, request.opportunity_id):
                yield f"data: {event.model_dump_json()}\n\n"
        except ClaudeError as e:
            error_event = StreamEvent(type="error", data={"message": str(e)})
            yield f"data: {error_event.model_dump_json()}\n\n"

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
