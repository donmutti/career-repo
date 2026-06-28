"""Opportunity embedding DAO — stores and queries float32 vectors via sqlite-vec."""

import struct
from typing import Optional

from api.db.connection import get_db_connection, dump_db


def _pack(vector: list[float]) -> bytes:
    return struct.pack(f"{len(vector)}f", *vector)


def _unpack(blob: bytes) -> list[float]:
    n = len(blob) // 4
    return list(struct.unpack(f"{n}f", blob))


class OpportunityEmbeddingDAO:

    @property
    def _conn(self):
        return get_db_connection()

    def upsert(self, opportunity_id: str, vector: list[float]) -> None:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()
        blob = _pack(vector)
        self._conn.execute(
            """
            INSERT INTO opportunity_embedding (opportunity_id, embedding, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(opportunity_id) DO UPDATE SET embedding = excluded.embedding, updated_at = excluded.updated_at
            """,
            (opportunity_id, blob, now),
        )
        self._conn.commit()
        dump_db()

    def get(self, opportunity_id: str) -> Optional[list[float]]:
        cursor = self._conn.execute(
            "SELECT embedding FROM opportunity_embedding WHERE opportunity_id = ?",
            (opportunity_id,),
        )
        row = cursor.fetchone()
        if not row:
            return None
        return _unpack(bytes(row[0]))

    def find_similar(
        self,
        opportunity_id: str,
        top_k: int = 5,
        min_similarity: float = 0.85,
    ) -> list[tuple[str, float]]:
        """Return [(similar_id, similarity), ...] excluding already-dismissed pairs."""
        cursor = self._conn.execute(
            """
            SELECT
                e2.opportunity_id,
                1.0 - vec_distance_cosine(e1.embedding, e2.embedding) AS similarity
            FROM opportunity_embedding e1
            JOIN opportunity_embedding e2 ON e2.opportunity_id != e1.opportunity_id
            LEFT JOIN opportunity_similarity os ON (
                os.id_a = MIN(e1.opportunity_id, e2.opportunity_id)
                AND os.id_b = MAX(e1.opportunity_id, e2.opportunity_id)
                AND os.dismissed_at IS NOT NULL
            )
            WHERE e1.opportunity_id = ?
              AND os.id_a IS NULL
              AND (1.0 - vec_distance_cosine(e1.embedding, e2.embedding)) >= ?
            ORDER BY similarity DESC
            LIMIT ?
            """,
            (opportunity_id, min_similarity, top_k),
        )
        return [(row[0], row[1]) for row in cursor.fetchall()]
