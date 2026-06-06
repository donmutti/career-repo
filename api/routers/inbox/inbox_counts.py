"""GET /inbox/counts, GET /inbox/sorted-counts"""

from datetime import date
from typing import Optional

from fastapi import APIRouter

from ...db import InboxEmailDAO, EmailOpportunityDAO

router = APIRouter(prefix="/inbox", tags=["inbox"])

email_dao = InboxEmailDAO()
email_opp_dao = EmailOpportunityDAO()


@router.get("/counts")
def inbox_counts(today: Optional[str] = None):
    """Return email counts for standard time windows."""
    if not today:
        today = date.today().isoformat()
    return email_dao.counts_by_window(today)


@router.get("/sorted-counts")
def inbox_sorted_counts():
    """Return {email_id: [sorted, total]} for all emails that have opportunities."""
    return email_opp_dao.sorted_counts()
