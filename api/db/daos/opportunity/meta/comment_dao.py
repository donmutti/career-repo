"""Comment DAO."""

from datetime import datetime
from typing import List, Optional

from ...base import VersionedEntityDAO
from api.models.entities import Comment, CommentVersion


class CommentDAO(VersionedEntityDAO[Comment]):
    table_name = "comment"
    version_table_name = "comment_version"
    version_fk_column = "comment_id"

    def create(self, opportunity_id: str, version: CommentVersion, created_at: Optional[datetime] = None) -> Comment:
        """Create a comment on an opportunity."""
        comment_id = self._generate_id()
        now = created_at or self._now()
        self._execute(
            f"INSERT INTO {self.table_name} (id, opportunity_id, created_at) VALUES (?, ?, ?)",
            (comment_id, opportunity_id, now),
        )
        self._insert_version(comment_id, version, now)
        self._save()
        return self.get(comment_id)

    def get(self, comment_id: str) -> Optional[Comment]:
        """Get a comment by ID with its current version."""
        cursor = self._execute(
            f"SELECT * FROM {self.table_name} WHERE id = ?", (comment_id,)
        )
        row = cursor.fetchone()
        if not row:
            return None
        try:
            return self._from_dict(dict(row))
        except ValueError:
            return None

    def list_for_opportunity(self, opportunity_id: str) -> List[Comment]:
        """List all active comments for an opportunity."""
        sql = f"""
            SELECT c.* FROM {self.table_name} c
            JOIN {self.version_table_name} cv ON c.id = cv.comment_id
            WHERE c.opportunity_id = ? AND cv.active_to IS NULL
            ORDER BY c.created_at DESC
        """
        cursor = self._execute(sql, (opportunity_id,))
        result = []
        for row in cursor.fetchall():
            try:
                result.append(self._from_dict(dict(row)))
            except ValueError:
                pass
        return result

    def relink(self, comment_id: str, new_opportunity_id: str) -> None:
        """Move a comment to a different opportunity."""
        self._execute(
            "UPDATE comment SET opportunity_id = ? WHERE id = ?",
            (new_opportunity_id, comment_id),
        )
        self._save()

    def delete(self, comment_id: str) -> None:
        """Delete a comment and all its versions."""
        self._execute(f"DELETE FROM {self.version_table_name} WHERE comment_id = ?", (comment_id,))
        self._execute(f"DELETE FROM {self.table_name} WHERE id = ?", (comment_id,))
        self._save()

    def _from_dict(self, row: dict) -> Comment:
        version_row = self._get_latest_version_row(row["id"])
        if not version_row:
            raise ValueError(f"No active version for comment {row['id']}")
        return Comment(
            id=row["id"],
            created_at=row["created_at"],
            opportunity_id=row["opportunity_id"],
            active_version=CommentVersion(
                active_from=version_row["active_from"],
                active_to=version_row.get("active_to"),
                body=version_row["body"],
            ),
        )

    def _version_to_dict(self, entity: CommentVersion) -> dict:
        return {"body": entity.body}
