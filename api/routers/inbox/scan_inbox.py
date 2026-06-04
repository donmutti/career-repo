"""POST /inbox/scan"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ...services.inbox import InboxService

router = APIRouter(prefix="/inbox", tags=["inbox"])

inbox_service = InboxService()


class ScanInboxStartResponseDto(BaseModel):
    run_id: str


@router.get("/scan/active")
def get_active_scan():
    """Return the active scan run ID if a scan is in progress, else null."""
    active = inbox_service.list_active_scans()
    return {"run_id": active[0].id if active else None}


@router.post("/scan", response_model=ScanInboxStartResponseDto)
async def scan_inbox():
    """Start an async inbox scan. Returns run_id immediately; poll GET /agent-runs/{run_id} for status."""
    if inbox_service.list_active_scans():
        raise HTTPException(status_code=409, detail="A scan is already in progress")

    run = inbox_service.create_scan_run()
    inbox_service.start_scan(run.id)
    return {"run_id": run.id}
