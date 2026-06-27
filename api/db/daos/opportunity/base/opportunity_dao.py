"""Opportunity DAO — flat single-table layout."""

import sqlite3
from typing import Any, Dict, List, Optional

from api.models.entities import (
    Opportunity, OpportunityVersion, OpportunityType, OpportunityStatus,
)
from api.models.types import EntityNotFoundError
from ...base import VersionedEntityDAO


class OpportunityDAO(VersionedEntityDAO[Opportunity]):
    table_name = "opportunity"
    version_table_name = "opportunity_version"
    version_fk_column = "opportunity_id"

    def require(self, opp_id: str) -> Opportunity:
        """Get opportunity by ID or raise EntityNotFoundError."""
        opp = self.get(opp_id)
        if not opp:
            raise EntityNotFoundError("Opportunity", opp_id)
        return opp

    def find_by_url(self, url: str) -> Optional[Opportunity]:
        """Find an opportunity by URL."""
        cursor = self._execute(f"SELECT id FROM {self.table_name} WHERE url = ?", (url,))
        row = cursor.fetchone()
        return self.get(row[0]) if row else None

    def create(self, url: Optional[str], opp_type: OpportunityType, version: OpportunityVersion) -> str:
        """Create a new opportunity. Returns existing ID if URL already exists (only when url is provided)."""
        if url:
            cursor = self._execute(
                f"SELECT id FROM {self.table_name} WHERE url = ?", (url,)
            )
            existing = cursor.fetchone()
            if existing:
                return existing[0]

        opp_id = self._generate_id()
        now = self._now()
        self._execute(
            f"INSERT INTO {self.table_name} (id, url, type, created_at) VALUES (?, ?, ?, ?)",
            (opp_id, url, opp_type.value, now),
        )

        self._insert_version(opp_id, version, now)
        self._save()
        return opp_id

    def set_sourcing_started(self, opp_id: str, run_id: str) -> None:
        """Stamp sourcing_started_at and clear sourcing_completed_at."""
        self._execute(
            f"UPDATE {self.table_name} SET sourcing_started_at = ?, sourcing_completed_at = NULL, sourcing_agent_run_id = ? WHERE id = ?",
            (self._now().isoformat(), run_id, opp_id),
        )
        self._save()

    def set_sourcing_completed(self, opp_id: str) -> None:
        """Stamp sourcing_completed_at."""
        self._execute(
            f"UPDATE {self.table_name} SET sourcing_completed_at = ? WHERE id = ?",
            (self._now().isoformat(), opp_id),
        )
        self._save()

    def set_url(self, opp_id: str, url: str) -> None:
        """Update the URL of an opportunity."""
        self._execute(
            f"UPDATE {self.table_name} SET url = ? WHERE id = ?",
            (url, opp_id),
        )
        self._save()

    def set_avatar_url(self, opp_id: str, avatar_url: str) -> None:
        """Save avatar URL for an opportunity."""
        self._execute(
            f"UPDATE {self.table_name} SET avatar_url = ? WHERE id = ?",
            (avatar_url, opp_id),
        )
        self._save()

    def reset_stuck_sourcing(self) -> None:
        """Stamp sourcing_completed_at on all opportunities stuck mid-sourcing."""
        self._execute(
            f"UPDATE {self.table_name} SET sourcing_completed_at = ? WHERE sourcing_started_at IS NOT NULL AND sourcing_completed_at IS NULL",
            (self._now().isoformat(),),
        )
        self._save()

    def delete(self, opp_id: str) -> None:
        """Hard-delete an opportunity and all its versions/metadata."""
        self._execute(f"DELETE FROM {self.version_table_name} WHERE {self.version_fk_column} = ?", (opp_id,))
        self._execute(f"DELETE FROM {self.table_name} WHERE id = ?", (opp_id,))
        self._save()

    def get(self, opp_id: str) -> Optional[Opportunity]:
        """Get opportunity with latest version."""
        cursor = self._execute(
            f"SELECT * FROM {self.table_name} WHERE id = ?", (opp_id,)
        )
        row = cursor.fetchone()
        if not row:
            return None
        try:
            return self._from_dict(dict(row))
        except ValueError:
            return None

    def list_all(self) -> List[Opportunity]:
        """List all opportunities with their latest version."""
        cursor = self._execute(
            f"""
            SELECT o.* FROM {self.table_name} o
            JOIN {self.version_table_name} v
              ON v.{self.version_fk_column} = o.id AND v.active_to IS NULL
            ORDER BY v.score DESC NULLS LAST, COALESCE(v.opened_on, o.created_at) DESC
            """
        )
        result = []
        for row in cursor.fetchall():
            try:
                result.append(self._from_dict(dict(row)))
            except ValueError:
                pass
        return result

    def _from_dict(self, row: dict) -> Opportunity:
        version_row = self._get_latest_version_row(row["id"])
        if not version_row:
            raise ValueError(f"No active version for opportunity {row['id']}")
        return Opportunity(
            id=row["id"],
            url=row["url"],
            created_at=row["created_at"],
            type=OpportunityType(row["type"]),
            sourcing_started_at=row.get("sourcing_started_at"),
            sourcing_completed_at=row.get("sourcing_completed_at"),
            sourcing_agent_run_id=row.get("sourcing_agent_run_id"),
            avatar_url=row.get("avatar_url"),
            active_version=self._version_from_row(version_row),
        )

    def _version_from_row(self, r: dict) -> OpportunityVersion:
        from api.models.entities import (
            JobContractType, JobWorkMode, JobPayPeriod,
            ProjectType, EducationType, EducationLevel,
            NetworkingType, LearningType,
        )

        def _opt_enum(cls, val):
            return cls(val) if val is not None else None

        return OpportunityVersion(
            active_from=r["active_from"],
            active_to=r.get("active_to"),
            status=OpportunityStatus(r["status"]),
            title=r.get("title"),
            description=r.get("description"),
            location=r.get("location"),
            score=r.get("score"),
            score_explanation=r.get("score_explanation"),
            opened_on=r["opened_on"],
            started_on=r.get("started_on"),
            completed_on=r.get("completed_on"),
            closed_on=r.get("closed_on"),
            archive_reason=r.get("archive_reason"),
            organization_name=r.get("organization_name"),
            parent_id=r.get("parent_id"),
            # Job
            job_role=r.get("job_role"),
            job_level=r.get("job_level"),
            job_contract_type=_opt_enum(JobContractType, r.get("job_contract_type")),
            job_work_mode=_opt_enum(JobWorkMode, r.get("job_work_mode")),
            job_pay_period=_opt_enum(JobPayPeriod, r.get("job_pay_period")),
            job_pay_currency=r.get("job_pay_currency"),
            job_pay_min=r.get("job_pay_min"),
            job_pay_max=r.get("job_pay_max"),
            # Project
            project_type=_opt_enum(ProjectType, r.get("project_type")),
            # Education
            education_type=_opt_enum(EducationType, r.get("education_type")),
            education_level=_opt_enum(EducationLevel, r.get("education_level")),
            # Networking
            networking_type=_opt_enum(NetworkingType, r.get("networking_type")),
            networking_is_online=bool(r["networking_is_online"]) if r.get("networking_is_online") is not None else None,
            networking_contact_info=r.get("networking_contact_info"),
            # Learning
            learning_type=_opt_enum(LearningType, r.get("learning_type")),
            learning_duration=r.get("learning_duration"),
        )

    def _version_to_dict(self, version: OpportunityVersion) -> Dict[str, Any]:
        data: Dict[str, Any] = {
            "status": version.status.value,
            "title": version.title,
            "opened_on": version.opened_on.isoformat(),
        }
        _opt_fields = [
            ("description", version.description),
            ("location", version.location),
            ("score", version.score),
            ("score_explanation", version.score_explanation),
            ("organization_name", version.organization_name),
            ("parent_id", version.parent_id),
            # dates
            ("started_on", version.started_on.isoformat() if version.started_on else None),
            ("completed_on", version.completed_on.isoformat() if version.completed_on else None),
            ("closed_on", version.closed_on.isoformat() if version.closed_on else None),
            ("archive_reason", version.archive_reason),
            # job
            ("job_role", version.job_role),
            ("job_level", version.job_level),
            ("job_contract_type", version.job_contract_type.value if version.job_contract_type else None),
            ("job_work_mode", version.job_work_mode.value if version.job_work_mode else None),
            ("job_pay_period", version.job_pay_period.value if version.job_pay_period else None),
            ("job_pay_currency", version.job_pay_currency),
            ("job_pay_min", version.job_pay_min),
            ("job_pay_max", version.job_pay_max),
            # project
            ("project_type", version.project_type.value if version.project_type else None),
            # education
            ("education_type", version.education_type.value if version.education_type else None),
            ("education_level", version.education_level.value if version.education_level else None),
            # networking
            ("networking_type", version.networking_type.value if version.networking_type else None),
            ("networking_is_online", int(version.networking_is_online) if version.networking_is_online is not None else None),
            ("networking_contact_info", version.networking_contact_info),
            # learning
            ("learning_type", version.learning_type.value if version.learning_type else None),
            ("learning_duration", version.learning_duration),
        ]
        for key, val in _opt_fields:
            if val is not None:
                data[key] = val
        return data
