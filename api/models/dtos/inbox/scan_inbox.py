"""Scan inbox DTOs."""

from datetime import date
from typing import List, Optional

from pydantic import BaseModel

from ...entities.inbox.inbox_email import InboxEmail


class ScanInboxRequestDto(BaseModel):
    """Request to scan inbox within a date range."""

    from_date: Optional[date] = None
    to_date: Optional[date] = None


class ScanInboxResponseDto(BaseModel):
    """Response from inbox scan."""

    emails: List[InboxEmail]
