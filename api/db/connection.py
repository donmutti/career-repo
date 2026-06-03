import json
import os
import sqlite3
import sqlite_vec
import threading
from pathlib import Path

from api.config import ROOT, get_db_path, get_dump_path

_local = threading.local()


def get_db_connection() -> sqlite3.Connection:
    """Get or create a per-thread SQLite connection."""
    if not hasattr(_local, "conn") or _local.conn is None:
        db_path = ROOT / get_db_path()
        db_path.parent.mkdir(parents=True, exist_ok=True)
        _local.conn = sqlite3.connect(str(db_path), timeout=10)
        _local.conn.row_factory = sqlite3.Row
        _local.conn.enable_load_extension(True)
        sqlite_vec.load(_local.conn)
        _local.conn.enable_load_extension(False)
        _local.conn.execute("PRAGMA journal_mode = WAL")
        _local.conn.execute("PRAGMA foreign_keys = ON")
        _local.conn.execute("PRAGMA busy_timeout = 10000")
    return _local.conn


def close_db_connection():
    """Close the current thread's database connection."""
    if hasattr(_local, "conn") and _local.conn:
        _local.conn.close()
        _local.conn = None


def init_db():
    """Hydrate from dump if this is a fresh DB with existing dump, then run pending migrations."""
    from api.db.migrations import run_migrations

    dump_path = ROOT / get_dump_path()

    conn = get_db_connection()
    is_fresh = conn.execute("SELECT count(*) FROM sqlite_master WHERE type='table'").fetchone()[0] == 0

    if is_fresh and dump_path.exists():
        _hydrate_from_dump(conn, dump_path)

    run_migrations(conn)


def _hydrate_from_dump(conn: sqlite3.Connection, dump_path: Path):
    """Populate database from JSON dump file."""
    with open(dump_path, "r") as f:
        dump = json.load(f)

    if not dump:
        return

    # Restore migration history so run_migrations knows what's already applied
    from api.db.migrations import _ensure_migration_table, _mark_all_applied
    _ensure_migration_table(conn)
    if "schema_migration" in dump:
        _insert_table_data(conn, "schema_migration", dump["schema_migration"])
    else:
        # Legacy dump without migration history — mark all current migrations as applied
        _mark_all_applied(conn)

    # Insert data following foreign key constraints
    _insert_table_data(conn, "profile", dump.get("profile", []))
    _insert_table_data(conn, "profile_version", dump.get("profile_version", []))
    _insert_table_data(conn, "work_permit", dump.get("work_permit", []))
    _insert_table_data(conn, "resume", dump.get("resume", []))
    _insert_table_data(conn, "work_experience", dump.get("work_experience", []))
    _insert_table_data(conn, "work_experience_version", dump.get("work_experience_version", []))
    _insert_table_data(conn, "work_experience_project", dump.get("work_experience_project", []))

    _insert_table_data(conn, "opportunity", dump.get("opportunity", []))
    _insert_table_data(conn, "opportunity_version", dump.get("opportunity_version", []))

    _insert_table_data(conn, "comment", dump.get("comment", []))
    _insert_table_data(conn, "comment_version", dump.get("comment_version", []))
    _insert_table_data(conn, "attachment", dump.get("attachment", []))

    _insert_table_data(conn, "inbox_email", dump.get("inbox_email", []))
    _insert_table_data(conn, "email_opportunity", dump.get("email_opportunity", []))
    _insert_table_data(conn, "agent_run", dump.get("agent_run", []))

    _insert_table_data(conn, "opportunity_embedding", dump.get("opportunity_embedding", []))
    _insert_table_data(conn, "opportunity_similarity", dump.get("opportunity_similarity", []))

    conn.commit()


def _insert_table_data(conn: sqlite3.Connection, table: str, rows: list):
    """Insert rows into a table."""
    if not rows:
        return

    first_row = rows[0]
    columns = ", ".join(first_row.keys())
    placeholders = ", ".join("?" * len(first_row))

    sql = f"INSERT INTO {table} ({columns}) VALUES ({placeholders})"
    for row in rows:
        values = tuple(row.values())
        conn.execute(sql, values)


def dump_db():
    """Export entire database to JSON dump file."""
    dump_path = ROOT / get_dump_path()

    conn = sqlite3.connect(str(ROOT / get_db_path()), timeout=10)
    cursor = conn.cursor()

    dump = {}

    # Get all table names from schema
    cursor.execute(
        "select name from sqlite_master where type='table' order by name"
    )
    tables = [row[0] for row in cursor.fetchall()]

    for table in tables:
        cursor.execute(f"SELECT * FROM {table}")
        columns = [description[0] for description in cursor.description]
        rows = cursor.fetchall()
        dump[table] = [dict(zip(columns, row)) for row in rows]

    # Write atomically via temp file
    temp_path = dump_path.with_suffix(".tmp")
    with open(temp_path, "w") as f:
        json.dump(dump, f, indent=2, default=str)

    os.replace(temp_path, dump_path)
    conn.close()
