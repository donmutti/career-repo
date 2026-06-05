"""GET /inbox/{email_id}/opportunities, PATCH /inbox/opportunities/{id}"""

from datetime import date
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from ...db import EmailOpportunityDAO
from ...db.daos.opportunity.base.opportunity_dao import OpportunityDAO
from ...db.daos.opportunity.meta.comment_dao import CommentDAO
from ...db.daos.agent.agent_run_dao import AgentRunDAO
from ...models.entities import EmailOpportunity
from ...models.entities.opportunity.meta.comment import CommentVersion
from ...models.entities.opportunity.base.opportunity import (
    OpportunityVersion, OpportunityType, OpportunityStatus,
)
from ...services.ai import runtime
from ...services.opportunity import OpportunityService

router = APIRouter(prefix="/inbox", tags=["inbox"])

email_opp_dao = EmailOpportunityDAO()
opportunity_dao = OpportunityDAO()
comment_dao = CommentDAO()
agent_run_dao = AgentRunDAO()
opp_service = OpportunityService()


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
            organization_name=eo.organization_name,
        )
        opportunity_id = opportunity_dao.create(eo.url or None, opp_type, version)
        comment_dao.create(opportunity_id, CommentVersion(body=f"Created from email /inbox/{eo.inbox_email_id}"))

        opp_service.source(opportunity_id)

    if body.status in ("pending", "skipped") and eo.opportunity_id:
        active_runs = agent_run_dao.list_active_by_external_id(eo.opportunity_id)
        for run in active_runs:
            await runtime.cancel(run.id)
        opportunity_dao.delete(eo.opportunity_id)
        opportunity_id = None

    return email_opp_dao.set_status(eo_id, body.status, opportunity_id)


class DeclinePendingDto(BaseModel):
    email_ids: list[str]


@router.post("/opportunities/decline-pending")
def decline_pending(body: DeclinePendingDto):
    """Set all pending email opportunities to skipped for the given emails."""
    count = email_opp_dao.decline_pending_for_emails(body.email_ids)
    return {"count": count}
