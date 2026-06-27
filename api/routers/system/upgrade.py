"""POST /system/upgrade — streams the upgrade pipeline as Server-Sent Events."""

import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from api.services.upgrade import stream_upgrade

router = APIRouter(prefix="/system", tags=["system"])


@router.post("/upgrade")
def post_upgrade():
    def gen():
        for event in stream_upgrade():
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
