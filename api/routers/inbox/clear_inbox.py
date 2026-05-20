"""DELETE /inbox/clear"""

from fastapi import APIRouter

from ...db import InboxEmailDAO

router = APIRouter(prefix="/inbox", tags=["inbox"])

email_dao = InboxEmailDAO()


@router.delete("/clear", status_code=204)
def clear_inbox():
    """Hard-delete all inbox emails and their email_opportunities."""
    email_dao.clear()
