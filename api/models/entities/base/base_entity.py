"""Base classes for domain models."""

from datetime import datetime

from pydantic import BaseModel


class BaseEntity(BaseModel):
    """Base class for all domain entities."""

    id: str
    created_at: datetime
