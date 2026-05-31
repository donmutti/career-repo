"""EmailOpportunity DAO."""

from typing import List, Optional

from api.models.entities import EmailOpportunity
from ..base import BaseEntityDAO


class EmailOpportunityDAO(BaseEntityDAO[EmailOpportunity]):

    def create(self, inbox_email_id: str, title: str, type: str, url: Optional[str] = None, organization_name: Optional[str] = None) -> EmailOpportunity:
        eo_id = self._generate_id()
        now = self._now()
        self._execute(
            "insert into email_opportunity (id, created_at, inbox_email_id, title, type, url, organization_name, status) values (?, ?, ?, ?, ?, ?, ?, 'pending')",
            (eo_id, now, inbox_email_id, title, type, url, organization_name),
        )
        self._save()
        return self.get(eo_id)

    def get(self, eo_id: str) -> Optional[EmailOpportunity]:
        row = self._execute("select * from email_opportunity where id = ?", (eo_id,)).fetchone()
        return self._from_row(dict(row)) if row else None

    def list_by_email(self, inbox_email_id: str) -> List[EmailOpportunity]:
        rows = self._execute(
            "select * from email_opportunity where inbox_email_id = ? order by created_at",
            (inbox_email_id,),
        ).fetchall()
        return [self._from_row(dict(r)) for r in rows]

    def set_status(self, eo_id: str, status: str, opportunity_id: Optional[str] = None) -> EmailOpportunity:
        self._execute(
            "update email_opportunity set status = ?, opportunity_id = ? where id = ?",
            (status, opportunity_id, eo_id),
        )
        self._save()
        return self.get(eo_id)

    def delete(self, eo_id: str) -> None:
        self._execute("delete from email_opportunity where id = ?", (eo_id,))
        self._save()

    def sorted_counts(self) -> dict:
        """Return {email_id: (sorted_count, total_count)} for all emails that have opportunities."""
        rows = self._execute("""
            select
                inbox_email_id,
                count(*) as total,
                sum(case when status in ('extracted', 'skipped') then 1 else 0 end) as sorted
            from email_opportunity
            group by inbox_email_id
        """).fetchall()
        return {r["inbox_email_id"]: (r["sorted"], r["total"]) for r in rows}

    def _from_row(self, row: dict) -> EmailOpportunity:
        return EmailOpportunity(
            id=row["id"],
            created_at=row["created_at"],
            inbox_email_id=row["inbox_email_id"],
            title=row["title"],
            type=row["type"],
            url=row.get("url"),
            organization_name=row.get("organization_name"),
            status=row["status"],
            opportunity_id=row.get("opportunity_id"),
        )
