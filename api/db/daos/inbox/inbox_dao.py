"""Inbox Email DAO."""

from datetime import datetime
from typing import List, Optional

from api.models.entities import InboxEmail
from ..base import BaseEntityDAO


class InboxEmailDAO(BaseEntityDAO[InboxEmail]):

    def create(
        self,
        external_id: str,
        received_at: datetime,
        from_address: str,
        to_address: str,
        subject: str,
        body: str,
    ) -> InboxEmail:
        """Create an inbox email record."""
        email_id = self._generate_id()
        now = self._now()
        self._execute(
            "insert into inbox_email (id, created_at, external_id, received_at, from_address, to_address, subject, body) values (?, ?, ?, ?, ?, ?, ?, ?)",
            (email_id, now, external_id, received_at.isoformat(), from_address, to_address, subject, body),
        )
        self._save()
        return self.get(email_id)

    def get(self, email_id: str) -> Optional[InboxEmail]:
        """Get an email by ID."""
        cursor = self._execute(
            "select * from inbox_email where id = ?", (email_id,)
        )
        row = cursor.fetchone()
        return self._from_dict(dict(row)) if row else None

    def get_by_external_id(self, external_id: str) -> Optional[InboxEmail]:
        """Get email by external ID (e.g., Gmail message ID)."""
        cursor = self._execute(
            "select * from inbox_email where external_id = ?", (external_id,)
        )
        row = cursor.fetchone()
        return self._from_dict(dict(row)) if row else None

    def list_all(self, from_date: Optional[str] = None, to_date: Optional[str] = None) -> List[InboxEmail]:
        """List emails ordered by received date descending, optionally filtered by date range."""
        query = "select * from inbox_email"
        params: list = []
        clauses = []
        if from_date:
            clauses.append("date(received_at) >= date(?)")
            params.append(from_date)
        if to_date:
            clauses.append("date(received_at) <= date(?)")
            params.append(to_date)
        if clauses:
            query += " where " + " and ".join(clauses)
        query += " order by received_at desc"
        cursor = self._execute(query, params)
        return [self._from_dict(dict(row)) for row in cursor.fetchall()]

    def counts_by_window(self, today: str) -> dict:
        """Return email counts and all_sorted flags for standard time windows."""
        cursor = self._execute("""
            select
                sum(case when date(received_at) = date(?) then 1 else 0 end) as today,
                sum(case when date(received_at) = date(?, '-1 day') then 1 else 0 end) as yesterday,
                sum(case when date(received_at) >= date(?, '-6 days') then 1 else 0 end) as last7,
                sum(case when date(received_at) >= date(?, '-29 days') then 1 else 0 end) as last30
            from inbox_email
        """, (today, today, today, today))
        row = cursor.fetchone()

        # all_sorted: for a window, every email that has opportunities must be fully sorted
        sorted_cursor = self._execute("""
            select
                e.id,
                date(e.received_at) as rdate,
                count(eo.id) as total,
                sum(case when eo.status in ('extracted', 'skipped') then 1 else 0 end) as sorted
            from inbox_email e
            join email_opportunity eo on eo.inbox_email_id = e.id
            group by e.id
        """)
        sorted_rows = sorted_cursor.fetchall()

        def all_sorted_for(window_dates: list[str]) -> bool:
            relevant = [r for r in sorted_rows if r["rdate"] in window_dates]
            return bool(relevant) and all(r["sorted"] == r["total"] for r in relevant)

        from datetime import date, timedelta
        d = date.fromisoformat(today)
        today_dates = [today]
        yesterday_dates = [(d - timedelta(days=1)).isoformat()]
        last7_dates = [(d - timedelta(days=i)).isoformat() for i in range(7)]
        last30_dates = [(d - timedelta(days=i)).isoformat() for i in range(30)]

        return {
            "today": row["today"] or 0,
            "yesterday": row["yesterday"] or 0,
            "last7": row["last7"] or 0,
            "last30": row["last30"] or 0,
            "today_all_sorted": all_sorted_for(today_dates),
            "yesterday_all_sorted": all_sorted_for(yesterday_dates),
            "last7_all_sorted": all_sorted_for(last7_dates),
            "last30_all_sorted": all_sorted_for(last30_dates),
        }

    def last_scanned_at(self) -> Optional[str]:
        """Return the completed_at of the most recent successful inbox scan, or None."""
        cursor = self._execute(
            "select max(completed_at) as ts from agent_run where agent = 'scan-inbox.md' and status = 'completed'"
        )
        row = cursor.fetchone()
        return row["ts"] if row else None

    def clear(self) -> None:
        """Hard-delete all inbox emails and their email_opportunities."""
        self._execute("delete from email_opportunity")
        self._execute("delete from inbox_email")
        self._save()

    def delete(self, email_id: str) -> None:
        """Hard-delete an inbox email by ID."""
        self._execute("delete from inbox_email where id = ?", (email_id,))
        self._save()

    def _from_dict(self, row: dict) -> InboxEmail:
        return InboxEmail(
            id=row["id"],
            created_at=row["created_at"],
            external_id=row["external_id"],
            received_at=row["received_at"],
            from_address=row["from_address"],
            to_address=row["to_address"],
            subject=row["subject"],
            body=row["body"],
        )
