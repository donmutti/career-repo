"""Timeline models."""

from datetime import date
from enum import Enum

from pydantic import BaseModel


class TimeWindowCode(str, Enum):
    ALL = "all"
    TODAY = "today"
    WEEK = "week"
    MONTH = "month"
    YEAR = "year"


class TimeWindow(BaseModel):
    """Time window for filtering."""

    code: TimeWindowCode
    from_date: date
    to_date: date
