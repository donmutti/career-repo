"""GET/POST /settings/inbox"""

from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from api.config import (
    get_inbox_scan_batch_size,
    get_inbox_scan_days,
    get_inbox_scan_keywords,
    set_config,
)
from api.db import InboxEmailDAO
from api.services.claude_cli import gmail_mcp_connected

router = APIRouter(prefix="/settings", tags=["settings"])
email_dao = InboxEmailDAO()


class GmailStatusDto(BaseModel):
    connected: Optional[bool]
    last_scan_at: Optional[str]


class InboxSettingsDto(BaseModel):
    scan_keywords: list[str]
    scan_days: int
    scan_batch_size: int
    gmail: GmailStatusDto


class InboxSettingsPatch(BaseModel):
    scan_keywords: Optional[list[str]] = None
    scan_days: Optional[int] = Field(default=None, gt=0)
    scan_batch_size: Optional[int] = Field(default=None, gt=0)


def _read() -> InboxSettingsDto:
    return InboxSettingsDto(
        scan_keywords=get_inbox_scan_keywords(),
        scan_days=get_inbox_scan_days(),
        scan_batch_size=get_inbox_scan_batch_size(),
        gmail=GmailStatusDto(
            connected=gmail_mcp_connected(),
            last_scan_at=email_dao.last_scanned_at(),
        ),
    )


@router.get("/inbox", response_model=InboxSettingsDto)
def get_inbox():
    return _read()


@router.post("/inbox", response_model=InboxSettingsDto)
def post_inbox(patch: InboxSettingsPatch):
    if patch.scan_keywords is not None:
        set_config("inbox", "scan_keywords", patch.scan_keywords)
    if patch.scan_days is not None:
        set_config("inbox", "scan_days", patch.scan_days)
    if patch.scan_batch_size is not None:
        set_config("inbox", "scan_batch_size", patch.scan_batch_size)
    return _read()
