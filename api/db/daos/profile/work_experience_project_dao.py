"""WorkExperienceProject DAO."""

from typing import List, Optional

from api.models.types import WorkExperienceProject
from ..base import BaseEntityDAO


class WorkExperienceProjectDAO(BaseEntityDAO):
    table_name = "work_experience_project"

    def list_for_experience(self, work_experience_id: str) -> List[WorkExperienceProject]:
        cursor = self._execute(
            "SELECT id, work_experience_id, name, description, status, start_date, end_date FROM work_experience_project WHERE work_experience_id = ? ORDER BY created_at ASC",
            (work_experience_id,),
        )
        return [self._row_to_model(dict(r)) for r in cursor.fetchall()]

    def create(self, work_experience_id: str, name: str, description: Optional[str] = None, status: Optional[str] = None, start_date: Optional[str] = None, end_date: Optional[str] = None) -> WorkExperienceProject:
        project_id = self._generate_id()
        now = self._now()
        self._execute(
            "INSERT INTO work_experience_project (id, work_experience_id, name, description, status, start_date, end_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (project_id, work_experience_id, name, description, status, start_date, end_date, now),
        )
        self._save()
        return self.get(project_id)

    def get(self, project_id: str) -> Optional[WorkExperienceProject]:
        cursor = self._execute(
            "SELECT id, work_experience_id, name, description, status, start_date, end_date FROM work_experience_project WHERE id = ?",
            (project_id,),
        )
        row = cursor.fetchone()
        return self._row_to_model(dict(row)) if row else None

    def update(self, project_id: str, **kwargs) -> Optional[WorkExperienceProject]:
        allowed = {'name', 'description', 'status', 'start_date', 'end_date'}
        fields = {k: v for k, v in kwargs.items() if k in allowed}
        if not fields:
            return self.get(project_id)
        sets = ', '.join(f"{k} = ?" for k in fields)
        self._execute(
            f"UPDATE work_experience_project SET {sets} WHERE id = ?",
            (*fields.values(), project_id),
        )
        self._save()
        return self.get(project_id)

    def delete(self, project_id: str) -> None:
        self._execute("DELETE FROM work_experience_project WHERE id = ?", (project_id,))
        self._save()

    def _row_to_model(self, row: dict) -> WorkExperienceProject:
        return WorkExperienceProject(
            id=row['id'],
            work_experience_id=row['work_experience_id'],
            name=row['name'],
            description=row.get('description'),
            status=row.get('status'),
            start_date=row.get('start_date'),
            end_date=row.get('end_date'),
        )
