"""Schema migration runner.

Migrations live in db/migrations/ as numbered SQL files:
    0000_baseline.sql
    0001_description.sql

A `schema_migration` table tracks which migrations have been applied.
Migrations run in filename order; each runs in a transaction.
"""

import sqlite3
from pathlib import Path

from api.config import ROOT


MIGRATIONS_DIR = ROOT / "db" / "migrations"


def run_migrations(conn: sqlite3.Connection) -> None:
    """Apply any pending migrations to the given connection."""
    _ensure_migration_table(conn)
    applied = _get_applied(conn)

    pending = sorted(
        f for f in MIGRATIONS_DIR.glob("*.sql")
        if f.name not in applied
    )

    for path in pending:
        _apply(conn, path)


def _ensure_migration_table(conn: sqlite3.Connection) -> None:
    conn.execute("""
        CREATE TABLE IF NOT EXISTS schema_migration (
            name TEXT PRIMARY KEY,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)
    conn.commit()


def _get_applied(conn: sqlite3.Connection) -> set[str]:
    rows = conn.execute("SELECT name FROM schema_migration").fetchall()
    return {row[0] for row in rows}


def _apply(conn: sqlite3.Connection, path: Path) -> None:
    sql = path.read_text()
    try:
        conn.executescript(sql)
        # executescript issues an implicit COMMIT, so no explicit commit needed
        # but we must record the migration in a fresh statement
        conn.execute(
            "INSERT INTO schema_migration (name) VALUES (?)", (path.name,)
        )
        conn.commit()
        print(f"[migrations] applied {path.name}")
    except Exception as e:
        conn.rollback()
        raise RuntimeError(f"Migration {path.name} failed: {e}") from e
