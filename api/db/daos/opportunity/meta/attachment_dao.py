"""Attachment DAO."""

from typing import List, Optional

from ...base import BaseEntityDAO
from api.models.entities import Attachment, AttachmentType


class AttachmentDAO(BaseEntityDAO[Attachment]):
    def create(
        self,
        opportunity_id: str,
        attachment_type: AttachmentType,
        file_path: str,
        file_type: str,
        title: Optional[str] = None,
    ) -> Attachment:
        """Create an attachment on an opportunity."""
        attach_id = self._generate_id()
        now = self._now()
        self._execute(
            "INSERT INTO attachment (id, opportunity_id, type, title, file_path, file_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (attach_id, opportunity_id, attachment_type.value, title, file_path, file_type, now),
        )
        self._save()
        return self.get(attach_id)

    def get(self, artifact_id: str) -> Optional[Attachment]:
        """Get an attachment by ID."""
        cursor = self._execute(
            "SELECT * FROM attachment WHERE id = ?", (artifact_id,)
        )
        row = cursor.fetchone()
        return self._from_dict(dict(row)) if row else None

    def list_for_opportunity(self, opportunity_id: str) -> List[Attachment]:
        """List all attachments for an opportunity."""
        cursor = self._execute(
            "SELECT * FROM attachment WHERE opportunity_id = ? ORDER BY created_at DESC",
            (opportunity_id,),
        )
        return [self._from_dict(dict(row)) for row in cursor.fetchall()]

    def delete(self, artifact_id: str) -> None:
        """Hard-delete an attachment by ID."""
        self._execute("DELETE FROM attachment WHERE id = ?", (artifact_id,))
        self._save()

    def _from_dict(self, row: dict) -> Attachment:
        return Attachment(
            id=row["id"],
            created_at=row["created_at"],
            opportunity_id=row["opportunity_id"],
            type=AttachmentType(row["type"]),
            title=row.get("title"),
            file_path=row["file_path"],
            file_type=row["file_type"],
        )
