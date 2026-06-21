"""DeclineReason entity."""

from ..base import BaseEntity


class DeclineReason(BaseEntity):
    """A user-supplied decline reason tracked with a use count."""

    text: str
    count: int
