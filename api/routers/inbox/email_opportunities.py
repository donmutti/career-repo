"""GET /inbox/{email_id}/opportunities, PATCH /inbox/opportunities/{id}"""

import asyncio
from datetime import date
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from ...db import EmailOpportunityDAO
from ...db.daos.opportunity.base.opportunity_dao import OpportunityDAO
from ...db.daos.opportunity.meta.comment_dao import CommentDAO
from ...db.daos.profile.profile_dao import ProfileDAO
from ...db.daos.profile.work_experience_dao import WorkExperienceDAO
from ...db.daos.agent.agent_run_dao import AgentRunDAO
from ...models.entities import EmailOpportunity
from ...models.entities.opportunity.meta.comment import CommentVersion
from ...models.entities.opportunity.base.opportunity import (
    OpportunityVersion, OpportunityType, OpportunityStatus,
)
from ...services.ai import ClaudeError, claude

router = APIRouter(prefix="/inbox", tags=["inbox"])

email_opp_dao = EmailOpportunityDAO()
opportunity_dao = OpportunityDAO()
comment_dao = CommentDAO()
profile_dao = ProfileDAO()
work_experience_dao = WorkExperienceDAO()
agent_run_dao = AgentRunDAO()


@router.get("/{email_id}/opportunities", response_model=list[EmailOpportunity])
def list_email_opportunities(email_id: str):
    """List all identified opportunities for an email."""
    return email_opp_dao.list_by_email(email_id)


class PatchEmailOpportunityDto(BaseModel):
    status: str  # extracted | skipped | pending
    opportunity_id: Optional[str] = None


@router.patch("/opportunities/{eo_id}", response_model=EmailOpportunity)
async def patch_email_opportunity(eo_id: str, body: PatchEmailOpportunityDto):
    """Update status of an email opportunity. On 'extracted', creates a real opportunity and auto-scores it."""
    eo = email_opp_dao.get(eo_id)
    if not eo:
        raise HTTPException(status_code=404, detail="EmailOpportunity not found")

    opportunity_id = body.opportunity_id

    if body.status == "extracted" and not eo.opportunity_id:
        opp_type = OpportunityType(eo.type) if eo.type in OpportunityType._value2member_map_ else OpportunityType.JOB
        version = OpportunityVersion(
            status=OpportunityStatus.OPENED,
            title=eo.title,
            opened_on=date.today(),
        )
        opportunity_id = opportunity_dao.create(eo.url or None, opp_type, version)
        comment_dao.create(opportunity_id, CommentVersion(body=f"Created from email /inbox/{eo.inbox_email_id}"))

        opportunity = opportunity_dao.get(opportunity_id)
        profile = profile_dao.get()
        work_experiences = work_experience_dao.list_for_profile(profile.id) if profile else []
        run = agent_run_dao.create("source-opportunity.md", opportunity_id)
        opportunity_dao.set_sourcing_started(opportunity_id, run.id)

        async def _source():
            try:
                result = await claude.source_opportunity(opportunity, profile, work_experiences, run_id=run.id)
                sourced = result.output
            except (ClaudeError, asyncio.CancelledError):
                opportunity_dao.set_sourcing_completed(opportunity_id)
                return
            from ...routers.opportunity.base.opportunity import _parse_version_fields
            avatar_url = sourced.pop("avatar_url", None)
            updates = {k: v for k, v in sourced.items() if v is not None}
            typed = _parse_version_fields(updates)
            enriched = opportunity.model_copy(update={
                "active_version": opportunity.active_version.model_copy(update=typed)
            })
            opportunity_dao.update(opportunity_id, enriched.active_version)
            if avatar_url:
                opportunity_dao.set_avatar_url(opportunity_id, avatar_url)
            opportunity_dao.set_sourcing_completed(opportunity_id)

        asyncio.create_task(_source())

    if body.status in ("pending", "skipped") and eo.opportunity_id:
        active_runs = agent_run_dao.list_active_for_opportunity(eo.opportunity_id)
        for run in active_runs:
            await claude.cancel(run.id)
        opportunity_dao.delete(eo.opportunity_id)
        opportunity_id = None

    return email_opp_dao.set_status(eo_id, body.status, opportunity_id)
