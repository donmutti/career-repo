"""WorkExperience DAO — versioned entity."""

from typing import List, Optional

from api.models.types import WorkExperience, WorkExperienceVersion
from ..base import VersionedEntityDAO


class WorkExperienceDAO(VersionedEntityDAO[WorkExperience]):
    table_name = "work_experience"
    version_table_name = "work_experience_version"
    version_fk_column = "work_experience_id"

    def create(
        self,
        profile_id: str,
        company: str,
        role: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        description: Optional[str] = None,
        skills: Optional[str] = None,
    ) -> WorkExperience:
        we_id = self._generate_id()
        now = self._now()
        version = WorkExperienceVersion(
            company=company,
            role=role,
            start_date=start_date,
            end_date=end_date,
            description=description,
            skills=skills,
        )
        self._execute(
            f"INSERT INTO {self.table_name} (id, profile_id, created_at) VALUES (?, ?, ?)",
            (we_id, profile_id, now),
        )
        self._insert_version(we_id, version, now)
        self._save()
        return self.get(we_id)

    def list_for_profile(self, profile_id: str) -> List[WorkExperience]:
        cursor = self._execute(
            f"""SELECT we.* FROM {self.table_name} we
                JOIN {self.version_table_name} v ON v.work_experience_id = we.id AND v.active_to IS NULL
                WHERE we.profile_id = ?
                ORDER BY COALESCE(v.start_date, we.created_at) DESC""",
            (profile_id,),
        )
        result = []
        for row in cursor.fetchall():
            we = self._from_dict(dict(row))
            if we:
                result.append(we)
        return result

    def get(self, we_id: str) -> Optional[WorkExperience]:
        cursor = self._execute(f"SELECT * FROM {self.table_name} WHERE id = ?", (we_id,))
        row = cursor.fetchone()
        return self._from_dict(dict(row)) if row else None

    def update(self, we_id: str, **fields) -> Optional[WorkExperience]:
        current = self.get(we_id)
        if not current:
            return None
        v = current.active_version
        new_version = WorkExperienceVersion(
            company=fields.get("company", v.company),
            role=fields.get("role", v.role),
            start_date=fields["start_date"] if "start_date" in fields else v.start_date,
            end_date=fields["end_date"] if "end_date" in fields else v.end_date,
            description=fields["description"] if "description" in fields else v.description,
            skills=fields["skills"] if "skills" in fields else v.skills,
        )
        self._insert_version(we_id, new_version)
        self._save()
        return self.get(we_id)

    def delete(self, we_id: str) -> None:
        self._execute("DELETE FROM work_experience_project WHERE work_experience_id = ?", (we_id,))
        self._execute(
            f"DELETE FROM {self.version_table_name} WHERE {self.version_fk_column} = ?",
            (we_id,),
        )
        self._execute(f"DELETE FROM {self.table_name} WHERE id = ?", (we_id,))
        self._save()

    def _from_dict(self, row: dict) -> Optional[WorkExperience]:
        version_row = self._get_latest_version_row(row["id"])
        if not version_row:
            return None
        return WorkExperience(
            id=row["id"],
            profile_id=row["profile_id"],
            created_at=str(row["created_at"]),
            active_version=WorkExperienceVersion(
                active_from=version_row.get("active_from"),
                active_to=version_row.get("active_to"),
                company=version_row["company"],
                role=version_row["role"],
                start_date=version_row.get("start_date"),
                end_date=version_row.get("end_date"),
                description=version_row.get("description"),
                skills=version_row.get("skills"),
            ),
        )

    def _version_to_dict(self, version: WorkExperienceVersion) -> dict:
        return {
            "company": version.company,
            "role": version.role,
            "start_date": version.start_date,
            "end_date": version.end_date,
            "description": version.description,
            "skills": version.skills,
        }
