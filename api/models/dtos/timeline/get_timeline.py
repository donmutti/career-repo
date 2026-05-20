from pydantic import BaseModel

"""Timeline DTOs."""

from datetime import date
from typing import Dict, List

from ...entities.opportunity.base import Opportunity
from ...entities.timeline import TimeWindowCode


class TimelineWindowDto(BaseModel):
    """Opportunities and metadata for a single time window."""

    code: TimeWindowCode
    from_date: date
    to_date: date
    count: int
    opportunities: List[Opportunity]


class GetTimelineResponseDto(BaseModel):
    """Response for GET /api/timeline — all windows with their opportunities."""

    windows: Dict[TimeWindowCode, TimelineWindowDto]
