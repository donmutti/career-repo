"""GET /system/status"""

from fastapi import APIRouter

from .. import __version__
from ..db.connection import get_db_connection
from ..services.ai import runtime

router = APIRouter(prefix="/system", tags=["system"])


@router.get("/status")
def get_system_status():
    """Get system status and health information."""
    try:
        conn = get_db_connection()
        conn.execute("SELECT 1").fetchone()
        db_status = "connected"
    except Exception:
        db_status = "disconnected"

    try:
        conn = get_db_connection()
        has_profile = conn.execute("SELECT id FROM profile LIMIT 1").fetchone() is not None
    except Exception:
        has_profile = False

    return {
        "status": "healthy" if db_status == "connected" else "unhealthy",
        "version": __version__,
        "database": db_status,
        "profile_exists": has_profile,
        "active_agent_runs": len(runtime.list_active()),
    }
