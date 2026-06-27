"""GET /settings/db, POST /settings/db/purge"""

from fastapi import APIRouter
from pydantic import BaseModel

from api.services.db_stats import db_size_bytes, purge_historical_versions, version_counts

router = APIRouter(prefix="/settings", tags=["settings"])


class DbStatsDto(BaseModel):
    size_bytes: int
    active_version_count: int
    historical_version_count: int


class PurgeResultDto(BaseModel):
    deleted: int
    size_bytes: int
    active_version_count: int
    historical_version_count: int


@router.get("/db", response_model=DbStatsDto)
def get_db():
    active, historical = version_counts()
    return DbStatsDto(
        size_bytes=db_size_bytes(),
        active_version_count=active,
        historical_version_count=historical,
    )


@router.post("/db/purge", response_model=PurgeResultDto)
def post_db_purge():
    deleted = purge_historical_versions()
    active, historical = version_counts()
    return PurgeResultDto(
        deleted=deleted,
        size_bytes=db_size_bytes(),
        active_version_count=active,
        historical_version_count=historical,
    )
