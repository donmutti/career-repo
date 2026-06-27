"""DB stats and maintenance helpers used by /settings/db."""

from api.config import ROOT, get_db_path
from api.db.connection import get_db_connection


def db_size_bytes() -> int:
    path = ROOT / get_db_path()
    return path.stat().st_size if path.exists() else 0


def _version_tables() -> list[str]:
    conn = get_db_connection()
    rows = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%_version'"
    ).fetchall()
    return [r[0] for r in rows]


def version_counts() -> tuple[int, int]:
    """Return (active_count, historical_count) across all *_version tables."""
    conn = get_db_connection()
    active = historical = 0
    for table in _version_tables():
        row = conn.execute(
            f"SELECT "
            f"  SUM(CASE WHEN active_to IS NULL THEN 1 ELSE 0 END), "
            f"  SUM(CASE WHEN active_to IS NOT NULL THEN 1 ELSE 0 END) "
            f"FROM {table}"
        ).fetchone()
        active += row[0] or 0
        historical += row[1] or 0
    return active, historical


def purge_historical_versions() -> int:
    """Delete every *_version row where active_to IS NOT NULL, plus rows in dependent
    tables that reference them. Returns *_version rows deleted."""
    conn = get_db_connection()
    # work_permit rows are snapshot-attached to a profile_version; historical permits
    # must be removed before their parent profile_version can be deleted.
    conn.execute(
        "DELETE FROM work_permit WHERE profile_version_id IN ("
        "  SELECT id FROM profile_version WHERE active_to IS NOT NULL"
        ")"
    )
    deleted = 0
    for table in _version_tables():
        cur = conn.execute(f"DELETE FROM {table} WHERE active_to IS NOT NULL")
        deleted += cur.rowcount
    conn.commit()
    return deleted
