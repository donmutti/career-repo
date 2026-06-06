"""GET /inbox"""

from typing import Optional

from fastapi import APIRouter, Query

from ...db import InboxEmailDAO
from ...models import InboxEmail

router = APIRouter(prefix="/inbox", tags=["inbox"])

email_dao = InboxEmailDAO()


@router.get("/pending", response_model=list[InboxEmail])
def list_pending_emails():
    """List emails that have at least one pending (unsorted) opportunity."""
    return email_dao.list_pending()


@router.get("", response_model=list[InboxEmail])
def list_emails(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
):
    """List emails, optionally filtered by received date range (YYYY-MM-DD)."""
    return email_dao.list_all(from_date=from_date, to_date=to_date)
