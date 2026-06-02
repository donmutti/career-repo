"""Opportunity similarity DAO."""

from datetime import datetime, timezone
from typing import Optional

from api.db.connection import get_db_connection, dump_db
from api.models.entities.opportunity import OpportunitySimilarity


def _norm(id_a: str, id_b: str) -> tuple[str, str]:
    """Lexicographic normalisation: always (min, max)."""
    return (min(id_a, id_b), max(id_a, id_b))


class OpportunitySimilarityDAO:

    @property
    def _conn(self):
        return get_db_connection()

    def upsert(self, id_a: str, id_b: str, similarity: float) -> None:
        a, b = _norm(id_a, id_b)
        now = datetime.now(timezone.utc).isoformat()
        self._conn.execute(
            """
            INSERT INTO opportunity_similarity (id_a, id_b, similarity, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id_a, id_b) DO UPDATE SET similarity = excluded.similarity, updated_at = excluded.updated_at
            """,
            (a, b, similarity, now, now),
        )
        self._conn.commit()
        dump_db()

    def list_for_opportunity(self, opportunity_id: str) -> list[OpportunitySimilarity]:
        cursor = self._conn.execute(
            """
            SELECT
                os.id_a, os.id_b, os.similarity, os.created_at, os.updated_at,
                ov.title, ov.organization_name, o.avatar_url
            FROM opportunity_similarity os
            JOIN opportunity o ON o.id = CASE WHEN os.id_a = ? THEN os.id_b ELSE os.id_a END
            JOIN opportunity_version ov ON ov.opportunity_id = o.id AND ov.active_to IS NULL
            WHERE (os.id_a = ? OR os.id_b = ?)
              AND os.dismissed_at IS NULL
            ORDER BY os.similarity DESC
            """,
            (opportunity_id, opportunity_id, opportunity_id),
        )
        results = []
        for row in cursor.fetchall():
            results.append(OpportunitySimilarity(
                id_a=row["id_a"],
                id_b=row["id_b"],
                similarity=row["similarity"],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
                title=row["title"],
                organization_name=row["organization_name"],
                avatar_url=row["avatar_url"],
            ))
        return results

    def get_raw_pair(self, id_a: str, id_b: str) -> Optional[dict]:
        """Return the raw row (including dismissed_at) for a pair, or None."""
        a, b = _norm(id_a, id_b)
        cursor = self._conn.execute(
            "SELECT * FROM opportunity_similarity WHERE id_a = ? AND id_b = ?",
            (a, b),
        )
        row = cursor.fetchone()
        return dict(row) if row else None

    def dismiss(self, id_a: str, id_b: str) -> None:
        a, b = _norm(id_a, id_b)
        now = datetime.now(timezone.utc).isoformat()
        self._conn.execute(
            "UPDATE opportunity_similarity SET dismissed_at = ? WHERE id_a = ? AND id_b = ?",
            (now, a, b),
        )
        self._conn.commit()
        dump_db()

    def delete_pair(self, id_a: str, id_b: str) -> None:
        a, b = _norm(id_a, id_b)
        self._conn.execute(
            "DELETE FROM opportunity_similarity WHERE id_a = ? AND id_b = ?",
            (a, b),
        )
        self._conn.commit()
        dump_db()
