"""Base DAO for all entities."""

import uuid
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Generic, Optional, TypeVar

from api.models.entities.base import BaseEntity
from ...connection import get_db_connection, dump_db

T = TypeVar("T", bound=BaseEntity)


class BaseEntityDAO(ABC, Generic[T]):
    """Connection, id generation, timestamps, persistence, and row mapping."""

    @property
    def conn(self):
        return get_db_connection()

    def _execute(self, sql: str, params=()):
        return self.conn.execute(sql, params)

    def _save(self):
        self.conn.commit()
        dump_db()

    @abstractmethod
    def get(self, id: str) -> Optional[T]:
        """Get entity by ID."""
        ...

    @abstractmethod
    def delete(self, id: str) -> None:
        """Delete entity by ID."""
        ...

    def _generate_id(self) -> str:
        return str(uuid.uuid4())

    def _now(self) -> datetime:
        from datetime import timezone
        return datetime.now(timezone.utc)

