"""CRUD and sub-resource routes for /opportunities"""

from datetime import date
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from fastapi.responses import FileResponse

from ...config import ROOT, get_attachment_path
from ...db import (
    OpportunityDAO,
    CommentDAO, AttachmentDAO,
    OpportunityEmbeddingDAO, OpportunitySimilarityDAO,
)
from ...models import (
    Opportunity, OpportunityVersion, OpportunityStatus, OpportunityType,
    OpportunitySimilarity,
    JobContractType, JobWorkMode, JobPayPeriod,
    ProjectType, EducationType, EducationLevel, NetworkingType, LearningType,
    CreateOpportunityRequestDto, UpdateOpportunityRequestDto,
    Comment, CommentVersion, CreateCommentRequestDto,
    Attachment, CreateAttachmentRequestDto,
)
from ...services.ai import runtime
from ...services.files import FileService
from ...services.opportunity import OpportunityService

router = APIRouter(prefix="/opportunities", tags=["opportunities"])
attachments_router = APIRouter(tags=["attachments"])

opp_dao = OpportunityDAO()
comment_dao = CommentDAO()
attach_dao = AttachmentDAO()
embedding_dao = OpportunityEmbeddingDAO()
similarity_dao = OpportunitySimilarityDAO()
files = FileService(ROOT / get_attachment_path())
opp_service = OpportunityService()


def _parse_version_fields(data: dict) -> dict:
    """Convert raw update dict string values to typed domain values."""
    enum_fields = {
        "status": OpportunityStatus,
        "job_contract_type": JobContractType,
        "job_work_mode": JobWorkMode,
        "job_pay_period": JobPayPeriod,
        "project_type": ProjectType,
        "education_type": EducationType,
        "education_level": EducationLevel,
        "networking_type": NetworkingType,
        "learning_type": LearningType,
    }
    date_fields = {"opened_on", "started_on", "completed_on", "closed_on"}
    result = {}
    for k, v in data.items():
        if k in enum_fields:
            try:
                result[k] = enum_fields[k](v)
            except ValueError:
                raise HTTPException(status_code=422, detail=f"Invalid value for {k!r}: {v!r}")
        elif k in date_fields:
            try:
                result[k] = date.fromisoformat(v)
            except (ValueError, TypeError):
                raise HTTPException(status_code=422, detail=f"Invalid date for {k!r}: {v!r}")
        else:
            result[k] = v
    return result


# ---------------------------------------------------------------------------
# Opportunity CRUD
# ---------------------------------------------------------------------------

@router.get("", response_model=List[Opportunity])
def list_opportunities():
    """List all opportunities."""
    return opp_dao.list_all()


@router.post("", response_model=Opportunity)
def create_opportunity(request: CreateOpportunityRequestDto):
    """Create a new opportunity with a URL. Returns 409 with existing ID if URL already exists."""
    try:
        opp_type = OpportunityType(request.type) if request.type else OpportunityType.JOB
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid opportunity type: {request.type!r}")
    title = request.title or None
    opened_on_date = date.fromisoformat(request.opened_on) if request.opened_on else date.today()

    existing = opp_dao.find_by_url(request.url)
    if existing:
        raise HTTPException(status_code=409, detail={"message": "Opportunity already exists", "details": {"id": existing.id}})

    raw = request.model_dump(exclude={"url", "type", "title", "opened_on"}, exclude_none=True)
    typed = _parse_version_fields(raw)

    version = OpportunityVersion(
        status=OpportunityStatus.OPENED,
        title=title,
        opened_on=opened_on_date,
        **typed,
    )
    opp_id = opp_dao.create(request.url, opp_type, version)
    return opp_dao.get(opp_id)


@router.get("/{opportunity_id}", response_model=Opportunity)
def get_opportunity(opportunity_id: str):
    """Get an opportunity by ID."""
    opp = opp_dao.get(opportunity_id)
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return opp


@router.patch("/{opportunity_id}", response_model=Opportunity)
def update_opportunity(opportunity_id: str, request: UpdateOpportunityRequestDto):
    """Update opportunity fields (creates a new version)."""
    opportunity = opp_dao.get(opportunity_id)
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    updates = request.model_dump(exclude_none=True)
    if not updates:
        return opportunity
    typed = _parse_version_fields(updates)
    enriched = opportunity.model_copy(update={
        "active_version": opportunity.active_version.model_copy(update=typed)
    })
    return opp_dao.update(opportunity_id, enriched.active_version)


class SetCompensationRequest(BaseModel):
    job_pay_min: Optional[float] = None
    job_pay_max: Optional[float] = None
    job_pay_currency: Optional[str] = None
    job_pay_period: Optional[str] = None


@router.patch("/{opportunity_id}/compensation", response_model=Opportunity)
def set_opportunity_compensation(opportunity_id: str, request: SetCompensationRequest):
    """Update compensation fields, supporting explicit null to clear values."""
    opportunity = opp_dao.get(opportunity_id)
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    updates = request.model_dump()  # include_none — explicit nulls clear fields
    typed = _parse_version_fields({k: v for k, v in updates.items() if v is not None})
    nulls = {k: None for k, v in updates.items() if v is None}
    enriched = opportunity.model_copy(update={
        "active_version": opportunity.active_version.model_copy(update={**typed, **nulls})
    })
    return opp_dao.update(opportunity_id, enriched.active_version)


class SetUrlRequest(BaseModel):
    url: str

@router.patch("/{opportunity_id}/url", response_model=Opportunity)
def set_opportunity_url(opportunity_id: str, request: SetUrlRequest):
    """Update the URL of an opportunity."""
    opportunity = opp_dao.get(opportunity_id)
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    old_url = opportunity.url
    new_url = request.url.strip()
    opp_dao.set_url(opportunity_id, new_url)
    comment_dao.create(opportunity_id, CommentVersion(body=f"Changed URL from {old_url or 'empty'} to {new_url or 'empty'}"))
    return opp_dao.get(opportunity_id)


@router.delete("/{opportunity_id}", status_code=204)
def delete_opportunity(opportunity_id: str):
    """Soft-delete an opportunity by closing its current version."""
    opp = opp_dao.get(opportunity_id)
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    opp_dao.delete(opportunity_id)


@router.get("/{opportunity_id}/agent-runs")
def list_opportunity_agent_runs(opportunity_id: str):
    """Return active agent runs for this opportunity."""
    opp = opp_dao.get(opportunity_id)
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return runtime.list_active_by_external_id(opportunity_id)


@router.get("/{opportunity_id}/history")
def get_opportunity_history(opportunity_id: str):
    """Get version history for an opportunity."""
    if not opp_dao.get(opportunity_id):
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return {"versions": opp_dao.get_versions(opportunity_id)}


# ---------------------------------------------------------------------------
# Sourcing
# ---------------------------------------------------------------------------

@router.post("/{opportunity_id}/source", status_code=202)
async def source_opportunity(opportunity_id: str):
    """AI-assisted sourcing: enriches details and scores the opportunity. Runs in background."""
    if not opp_dao.get(opportunity_id):
        raise HTTPException(status_code=404, detail="Opportunity not found")
    opp_service.source(opportunity_id)
    return {"status": "started"}


# ---------------------------------------------------------------------------
# Comments
# ---------------------------------------------------------------------------

@router.get("/{opportunity_id}/comments", response_model=List[Comment])
def list_comments(opportunity_id: str):
    """List all comments for an opportunity."""
    if not opp_dao.get(opportunity_id):
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return comment_dao.list_for_opportunity(opportunity_id)


@router.post("/{opportunity_id}/comments", response_model=Comment)
def create_comment(opportunity_id: str, request: CreateCommentRequestDto):
    """Create a comment on an opportunity."""
    if not opp_dao.get(opportunity_id):
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return comment_dao.create(opportunity_id, CommentVersion(body=request.body))


# ---------------------------------------------------------------------------
# Attachments
# ---------------------------------------------------------------------------

@router.get("/{opportunity_id}/attachments", response_model=List[Attachment])
def list_attachments(opportunity_id: str):
    """List all attachments for an opportunity."""
    if not opp_dao.get(opportunity_id):
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return attach_dao.list_for_opportunity(opportunity_id)


@router.post("/{opportunity_id}/attachments", response_model=Attachment)
def create_attachment(opportunity_id: str, request: CreateAttachmentRequestDto):
    """Create an attachment for an opportunity."""
    if not opp_dao.get(opportunity_id):
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return attach_dao.create(
        opportunity_id=opportunity_id,
        attachment_type=request.attachment_type,
        file_path=request.file_path,
        file_type=request.file_type,
        title=request.title,
    )


# ---------------------------------------------------------------------------
# Cover letter (Job-specific)
# ---------------------------------------------------------------------------

@router.get("/{opportunity_id}/cover-letter/active")
def get_active_cover_letter_run(opportunity_id: str):
    """Return the active cover-letter run ID for this opportunity, or null."""
    for run in runtime.list_active_by_external_id(opportunity_id):
        if run.agent == "generate-attachment.md":
            return {"run_id": run.id}
    return {"run_id": None}


@router.post("/{opportunity_id}/cover-letter", status_code=202)
async def generate_cover_letter(opportunity_id: str):
    """Generate a cover letter for a Job opportunity. Runs in background; poll agent run for completion."""
    opportunity = opp_dao.get(opportunity_id)
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    if opportunity.type != OpportunityType.JOB:
        raise HTTPException(status_code=400, detail="Cover letter can only be generated for Job opportunities")
    handle = opp_service.generate_cover_letter(opportunity_id)
    return {"run_id": handle.run_id}


# ---------------------------------------------------------------------------
# Similarity
# ---------------------------------------------------------------------------

@router.get("/{opportunity_id}/similar", response_model=List[OpportunitySimilarity])
def list_similar(opportunity_id: str):
    """Return undismissed near-duplicate candidates for an opportunity."""
    if not opp_dao.get(opportunity_id):
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return similarity_dao.list_for_opportunity(opportunity_id)


@router.delete("/{opportunity_id}/similar/{neighbor_id}", status_code=204)
def dismiss_similar(opportunity_id: str, neighbor_id: str):
    """Dismiss a near-duplicate candidate (sets dismissed_at)."""
    if not opp_dao.get(opportunity_id):
        raise HTTPException(status_code=404, detail="Opportunity not found")
    if not opp_dao.get(neighbor_id):
        raise HTTPException(status_code=404, detail="Neighbor opportunity not found")
    similarity_dao.dismiss(opportunity_id, neighbor_id)


@router.post("/{opportunity_id}/absorb/{neighbor_id}", status_code=204)
def absorb_opportunity(opportunity_id: str, neighbor_id: str):
    """Merge neighbor into this opportunity, then hard-delete the neighbor."""
    canonical = opp_dao.get(opportunity_id)
    if not canonical:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    duplicate = opp_dao.get(neighbor_id)
    if not duplicate:
        raise HTTPException(status_code=404, detail="Neighbor opportunity not found")

    pair = similarity_dao.get_raw_pair(opportunity_id, neighbor_id)
    if pair and pair.get("dismissed_at"):
        raise HTTPException(status_code=409, detail="Similarity pair has already been dismissed")

    c = canonical.active_version
    d = duplicate.active_version

    # Relink duplicate's comments
    for comment in comment_dao.list_for_opportunity(neighbor_id):
        comment_dao.relink(comment.id, opportunity_id)

    # Create absorbed note with duplicate's metadata and description
    dup_label = " – ".join(filter(None, [d.title, d.organization_name]))
    url_part = f" ({duplicate.url})" if duplicate.url else ""
    meta_parts = [f"Copied from {dup_label}{url_part}"]
    if d.job_pay_min or d.job_pay_max:
        currency = d.job_pay_currency or ""
        period = f"/{d.job_pay_period.value}" if d.job_pay_period else ""
        pay_str = f"{currency}{int(d.job_pay_min):,}" if d.job_pay_min else ""
        if d.job_pay_max:
            pay_str += f" – {currency}{int(d.job_pay_max):,}"
        meta_parts.append(f"Pay: {pay_str}{period}")
    meta_line = " · ".join(meta_parts)
    note_body = f"{meta_line}:\n\n{d.description}" if d.description else meta_line
    comment_dao.create(opportunity_id, CommentVersion(body=note_body), created_at=duplicate.created_at)

    # Apply canonical version unchanged
    opp_dao.update(opportunity_id, c)

    # Delete similarity row before deleting duplicate (avoid cascade race)
    similarity_dao.delete_pair(opportunity_id, neighbor_id)

    # Hard-delete duplicate
    opp_dao.delete(neighbor_id)


# ---------------------------------------------------------------------------
# Attachment download
# ---------------------------------------------------------------------------

@attachments_router.delete("/attachments/{attachment_id}", status_code=204)
def delete_attachment(attachment_id: str):
    """Hard-delete an attachment."""
    attachment = attach_dao.get(attachment_id)
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    attach_dao.delete(attachment_id)


@attachments_router.get("/attachments/{attachment_id}/download")
def download_attachment(attachment_id: str):
    """Download an attachment file."""
    attachment = attach_dao.get(attachment_id)
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    full_path = files.artifact_root / attachment.file_path
    if not full_path.exists():
        raise HTTPException(status_code=404, detail=f"Attachment file not found at {attachment.file_path}")
    suffix = full_path.suffix
    filename = f"{attachment.title}{suffix}" if attachment.title else full_path.name
    return FileResponse(path=full_path, filename=filename, media_type=attachment.file_type)
