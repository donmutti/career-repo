"""Base DAO for versioned entities (root table + version table)."""

from abc import abstractmethod
from datetime import datetime
from typing import Any, Dict, List, Optional, TypeVar

from api.models.entities.base import EntityVersion
from .base_entity_dao import BaseEntityDAO, T

V = TypeVar("V", bound=EntityVersion)


class VersionedEntityDAO(BaseEntityDAO[T]):
    """Adds versioning operations for entities with a root + version table pair."""

    table_name: str
    version_table_name: str
    version_fk_column: str  # e.g. "profile_id", "opportunity_id"

    def update(self, id: str, version: V) -> Optional[T]:
        """Insert a new version and return the updated entity."""
        self._insert_version(id, version)
        self._save()
        return self.get(id)

    def _insert_version(self, id: str, version: V, active_from: Optional[datetime] = None) -> str:
        """Insert a new version record from a version entity."""
        version_id = self._generate_id()
        now = active_from or self._now()
        data = self._version_to_dict(version)

        columns = ["id", self.version_fk_column, "active_from"]
        values = [version_id, id, now]

        for key, value in data.items():
            columns.append(key)
            values.append(value)

        placeholders = ", ".join("?" * len(values))
        sql = f"INSERT INTO {self.version_table_name} ({', '.join(columns)}) VALUES ({placeholders})"

        self._execute(sql, values)
        return version_id

    def delete(self, id: str) -> None:
        """Soft-delete by closing the current version."""
        self._execute(
            f"UPDATE {self.version_table_name} SET active_to = ? WHERE {self.version_fk_column} = ? AND active_to IS NULL",
            (self._now(), id),
        )
        self._save()

    def get_versions(self, id: str) -> List[Dict[str, Any]]:
        """Get all version records for an entity as raw dicts."""
        sql = f"""
            SELECT * FROM {self.version_table_name}
            WHERE {self.version_fk_column} = ?
            ORDER BY active_from DESC
        """
        cursor = self._execute(sql, (id,))
        return [dict(row) for row in cursor.fetchall()]

    @abstractmethod
    def _version_to_dict(self, version: V) -> Dict[str, Any]:
        """Map a version instance to a raw dict for persistence."""
        ...

    def _get_latest_version_row_from(self, version_table: str, fk_column: str, id: str) -> Optional[Dict[str, Any]]:
        """Get the latest active version from an arbitrary version table."""
        sql = f"""
            SELECT * FROM {version_table}
            WHERE {fk_column} = ? AND active_to IS NULL
            ORDER BY active_from DESC LIMIT 1
        """
        cursor = self._execute(sql, (id,))
        row = cursor.fetchone()
        return dict(row) if row else None

    def _get_latest_version_row(self, id: str) -> Optional[Dict[str, Any]]:
        """Get the latest active version as a raw dict."""
        return self._get_latest_version_row_from(self.version_table_name, self.version_fk_column, id)
