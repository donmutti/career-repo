"""Base classes for versioned domain entities."""

from datetime import datetime, timezone
from typing import Generic, Optional, TypeVar

from pydantic import BaseModel, Field

from .base_entity import BaseEntity


class EntityVersion(BaseModel):
    """Base class for all entity version records."""

    active_from: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    active_to: Optional[datetime] = None


V = TypeVar("V", bound=EntityVersion)


class VersionedEntity(BaseEntity, Generic[V]):
    """Base class for versioned entities that own an active version."""

    active_version: V
