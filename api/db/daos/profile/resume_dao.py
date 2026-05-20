"""Resume DAO."""
from typing import List, Optional
from api.models.types import Resume
from ..base import BaseEntityDAO

class ResumeDAO(BaseEntityDAO):
    table_name = "resume"

    def list_for_profile(self, profile_id: str) -> List[Resume]:
        cursor = self._execute(
            "SELECT id, profile_id, file_name, original_name, created_at FROM resume WHERE profile_id = ? ORDER BY created_at DESC",
            (profile_id,),
        )
        return [self._row_to_model(dict(r)) for r in cursor.fetchall()]

    def create(self, profile_id: str, file_name: str, original_name: str) -> Resume:
        resume_id = self._generate_id()
        now = self._now()
        self._execute(
            "INSERT INTO resume (id, profile_id, file_name, original_name, created_at) VALUES (?, ?, ?, ?, ?)",
            (resume_id, profile_id, file_name, original_name, now),
        )
        self._save()
        return self.get(resume_id)

    def get(self, resume_id: str) -> Optional[Resume]:
        cursor = self._execute(
            "SELECT id, profile_id, file_name, original_name, created_at FROM resume WHERE id = ?",
            (resume_id,),
        )
        row = cursor.fetchone()
        return self._row_to_model(dict(row)) if row else None

    def delete(self, resume_id: str) -> None:
        self._execute("DELETE FROM resume WHERE id = ?", (resume_id,))
        self._save()

    def _row_to_model(self, row: dict) -> Resume:
        return Resume(
            id=row['id'],
            profile_id=row['profile_id'],
            file_name=row['file_name'],
            original_name=row['original_name'],
            created_at=row['created_at'],
        )
