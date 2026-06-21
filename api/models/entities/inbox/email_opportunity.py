"""EmailOpportunity entity."""

from typing import Optional

from ..base import BaseEntity


class EmailOpportunity(BaseEntity):
    """A potential opportunity identified by Claude within an inbox email."""

    inbox_email_id: str
    title: str
    type: str
    url: Optional[str] = None
    organization_name: Optional[str] = None
    location: Optional[str] = None
    status: str  # pending | extracted | skipped
    opportunity_id: Optional[str] = None
    reason: Optional[str] = None
