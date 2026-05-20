"""Profile DAO."""

from datetime import datetime
from typing import List, Optional

from api.models.entities import Profile, ProfileVersion
from api.models.types import WorkPermit, WorkPermitType
from ..base import VersionedEntityDAO


class ProfileDAO(VersionedEntityDAO[Profile]):
    table_name = "profile"
    version_table_name = "profile_version"
    version_fk_column = "profile_id"

    def create(self, full_name: str, voice_settings: str = "") -> str:
        """Create a new profile."""
        profile_id = self._generate_id()
        now = self._now()
        version = ProfileVersion(
            active_from=now,
            full_name=full_name,
        )
        self._execute(
            f"INSERT INTO {self.table_name} (id, created_at) VALUES (?, ?)",
            (profile_id, now),
        )
        self._insert_version(profile_id, version, now)
        self._save()
        return profile_id

    def get(self, id: str = "") -> Optional[Profile]:
        """Get the profile (single-user app)."""
        cursor = self._execute(f"SELECT * FROM {self.table_name} LIMIT 1")
        row = cursor.fetchone()
        if not row:
            return None
        try:
            return self._from_dict(dict(row))
        except ValueError:
            return None

    def update(self, profile_id: str, version: ProfileVersion) -> Optional[Profile]:
        """Insert a new version for an existing profile."""
        self._insert_version(profile_id, version)
        self._save()
        return self.get()

    def delete(self, id: str = "") -> None:
        raise NotImplementedError

    def _insert_version(self, entity_id: str, version: ProfileVersion, active_from: Optional[datetime] = None) -> str:
        """Insert a new profile version and all associated work permit records."""
        version_id = super()._insert_version(entity_id, version, active_from)
        for wp in version.work_permits:
            self._execute(
                "insert into work_permit (id, profile_version_id, permit_type, country, description) values (?, ?, ?, ?, ?)",
                (self._generate_id(), version_id, wp.type.value, wp.country, wp.description),
            )
        return version_id

    def _from_dict(self, row: dict) -> Profile:
        profile_id = row["id"]
        version_row = self._get_latest_version_row(profile_id)
        if not version_row:
            raise ValueError(f"No active version for profile {profile_id}")

        version_id = version_row["id"]

        cursor = self._execute(
            "select permit_type, country, description from work_permit where profile_version_id = ?",
            (version_id,),
        )
        work_permits: List[WorkPermit] = [
            WorkPermit(type=WorkPermitType(r[0]), country=r[1] or "", description=r[2])
            for r in cursor.fetchall()
        ]

        return Profile(
            id=profile_id,
            created_at=row["created_at"],
            active_version=ProfileVersion(
                active_from=version_row["active_from"],
                active_to=version_row.get("active_to"),
                full_name=version_row["full_name"],
                email=version_row.get("email"),
                phone=version_row.get("phone"),
                github_url=version_row.get("github_url"),
                linkedin_url=version_row.get("linkedin_url"),
                website_url=version_row.get("website_url"),
                location=version_row.get("location"),
                work_permits=work_permits,
                job_preferences=version_row.get("job_preferences"),
                job_dealbreakers=version_row.get("job_dealbreakers"),
                voice_settings=version_row.get("voice_settings") or "",
                avatar_file_name=version_row.get("avatar_file_name"),
            ),
        )

    def _version_to_dict(self, version: ProfileVersion) -> dict:
        return {
            "full_name": version.full_name,
            "email": version.email,
            "phone": version.phone,
            "github_url": version.github_url,
            "linkedin_url": version.linkedin_url,
            "website_url": version.website_url,
            "location": version.location,
            "job_preferences": version.job_preferences,
            "job_dealbreakers": version.job_dealbreakers,
            "voice_settings": version.voice_settings,
            "avatar_file_name": version.avatar_file_name,
        }
