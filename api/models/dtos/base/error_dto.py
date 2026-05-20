"""Error response DTO."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ErrorDto(BaseModel):
    """Standard error response shape."""

    timestamp: datetime
    status: int
    error: str
    path: str
    message: Optional[str] = None
