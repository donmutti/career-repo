"""Inbox models."""

from datetime import datetime

from ..base import BaseEntity


class InboxEmail(BaseEntity):
    """Email from inbox."""

    external_id: str
    received_at: datetime
    from_address: str
    to_address: str
    subject: str
    body: str
