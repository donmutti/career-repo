"""GET /inbox/status"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from ...db import InboxEmailDAO

router = APIRouter(prefix="/inbox", tags=["inbox"])
email_dao = InboxEmailDAO()


class InboxStatusDto(BaseModel):
    last_scanned_at: Optional[str] = None


@router.get("/status", response_model=InboxStatusDto)
def inbox_status():
    """Return inbox scan metadata."""
    return InboxStatusDto(last_scanned_at=email_dao.last_scanned_at())
