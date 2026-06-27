"""FastAPI application entry point."""

import asyncio
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Add project root to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from api import __version__
from api.models.types import EntityNotFoundError
from api.config import get_api_host, get_api_port, get_ui_port
from api.db import init_db
from api.db.connection import close_db_connection
from api.db.daos.opportunity.base.opportunity_dao import OpportunityDAO
from api.routers import opportunity, inbox, profile, agent, get_status, settings
from api.services.ai import embedding
from api.routers.profile import work_experience_projects
from api.routers.profile import resumes as profile_resumes
from api.routers.profile import work_experiences as profile_work_experiences
from api.routers.opportunity import comments as opportunity_comments
from api.routers.opportunity.opportunity import attachments_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown events."""
    init_db()
    opp_dao = OpportunityDAO()
    opp_dao.reset_stuck_sourcing()
    asyncio.create_task(embedding.warmup())
    await asyncio.sleep(0)  # yield once so the warmup task starts before the first request arrives
    yield
    close_db_connection()


# Create FastAPI app
app = FastAPI(
    title="Career Repo API",
    description="Local-first career tracking API",
    version=__version__,
    lifespan=lifespan,
    redirect_slashes=False,
)

# CORS middleware — allow UI origin from config
_ui_port = get_ui_port()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[f"http://localhost:{_ui_port}", f"http://127.0.0.1:{_ui_port}"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include opportunity routers
app.include_router(opportunity.opportunity.router, prefix="/api")
app.include_router(attachments_router, prefix="/api")
app.include_router(opportunity_comments.router, prefix="/api")

# Include inbox routers
app.include_router(inbox.scan_inbox.router, prefix="/api")
app.include_router(inbox.list_emails.router, prefix="/api")
app.include_router(inbox.inbox_status.router, prefix="/api")
app.include_router(inbox.inbox_counts.router, prefix="/api")
app.include_router(inbox.email_opportunities.router, prefix="/api")
app.include_router(inbox.clear_inbox.router, prefix="/api")
app.include_router(inbox.get_email.router, prefix="/api")

# Include profile routers
app.include_router(profile.profile.router, prefix="/api")
app.include_router(work_experience_projects.router, prefix="/api")
app.include_router(profile_resumes.router, prefix="/api")
app.include_router(profile_work_experiences.router, prefix="/api")

app.include_router(get_status.router, prefix="/api")

# Include settings routers
app.include_router(settings.general.router, prefix="/api")
app.include_router(settings.db.router, prefix="/api")
app.include_router(settings.inbox.router, prefix="/api")

# Include agent run routers
app.include_router(agent.list_agent_runs.router, prefix="/api")
app.include_router(agent.get_agent_run.router, prefix="/api")
app.include_router(agent.stream_agent_run.router, prefix="/api")
app.include_router(agent.cancel_agent_run.router, prefix="/api")


@app.exception_handler(EntityNotFoundError)
async def entity_not_found_handler(request: Request, exc: EntityNotFoundError):
    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.get("/")
def root():
    """API root."""
    return {"message": "Career Repo API", "version": __version__}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=get_api_host(), port=get_api_port())
