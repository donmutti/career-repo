"""POST /inbox/scan"""

from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ...services.inbox import InboxService

router = APIRouter(prefix="/inbox", tags=["inbox"])

inbox_service = InboxService()


class ScanInboxStartRequestDto(BaseModel):
    last_scanned_at: Optional[str] = None


class ScanInboxStartResponseDto(BaseModel):
    run_id: str


@router.get("/scan/active")
def get_active_scan():
    """Return the active scan run ID if a scan is in progress, else null."""
    active = inbox_service.list_active_scans()
    return {"run_id": active[0].id if active else None}


@router.post("/scan", response_model=ScanInboxStartResponseDto)
async def scan_inbox(body: ScanInboxStartRequestDto = ScanInboxStartRequestDto()):
    """Start an async inbox scan. Returns run_id immediately; poll GET /agent-runs/{run_id} for status."""
    if inbox_service.list_active_scans():
        raise HTTPException(status_code=409, detail="A scan is already in progress")

    handle = inbox_service.start_scan(last_scanned_at=body.last_scanned_at)
    return {"run_id": handle.run_id}
