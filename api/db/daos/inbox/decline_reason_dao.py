"""DeclineReason DAO."""

from typing import List, Optional

from api.models.entities.inbox.decline_reason import DeclineReason
from ..base import BaseEntityDAO

NOT_FOR_ME_ID = "00000000-0000-0000-0000-000000000000"


class DeclineReasonDAO(BaseEntityDAO[DeclineReason]):

    def list_by_count(self) -> List[DeclineReason]:
        """Return user-defined reasons ordered by count descending (excludes 'Not for me')."""
        rows = self._execute(
            "select * from decline_reason where id != ? order by count desc",
            (NOT_FOR_ME_ID,),
        ).fetchall()
        return [self._from_row(dict(r)) for r in rows]

    def get(self, reason_id: str) -> Optional[DeclineReason]:
        row = self._execute(
            "select * from decline_reason where id = ?", (reason_id,)
        ).fetchone()
        return self._from_row(dict(row)) if row else None

    def record(self, text: Optional[str]) -> DeclineReason:
        """Increment count for an existing reason or insert a new one. Use text=None for 'Not for me'."""
        if text is None:
            self._execute(
                "update decline_reason set count = count + 1 where id = ?",
                (NOT_FOR_ME_ID,),
            )
            self._save()
            return self.get(NOT_FOR_ME_ID)
        existing = self._execute(
            "select * from decline_reason where text = ?", (text,)
        ).fetchone()
        if existing:
            self._execute(
                "update decline_reason set count = count + 1 where text = ?", (text,)
            )
            self._save()
            return self._from_row(dict(self._execute(
                "select * from decline_reason where text = ?", (text,)
            ).fetchone()))
        new_id = self._generate_id()
        now = self._now()
        self._execute(
            "insert into decline_reason (id, created_at, text, count) values (?, ?, ?, 1)",
            (new_id, now, text),
        )
        self._save()
        return self.get(new_id)

    def delete(self, reason_id: str) -> None:
        raise NotImplementedError("DeclineReasons are not deleted individually.")

    def _from_row(self, row: dict) -> DeclineReason:
        return DeclineReason(
            id=row["id"],
            created_at=row["created_at"],
            text=row.get("text"),
            count=row["count"],
        )
