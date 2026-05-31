"""CRUD and sub-resource routes for /opportunities"""

import asyncio
from datetime import date
from typing import List

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from ....config import ROOT, get_attachment_path
from ....db import (
    OpportunityDAO, ProfileDAO, WorkExperienceDAO,
    CommentDAO, AttachmentDAO,
    AgentRunDAO,
)
from ....models import (
    Opportunity, OpportunityVersion, OpportunityStatus, OpportunityType,
    JobContractType, JobWorkMode, JobPayPeriod,
    ProjectType, EducationType, EducationLevel, NetworkingType, LearningType,
    CreateOpportunityRequestDto, UpdateOpportunityRequestDto,
    Comment, CommentVersion, CreateCommentRequestDto,
    Attachment, AttachmentType, CreateAttachmentRequestDto,
    AgentRun,
)
from ....services.ai import ClaudeError, claude
from ....services.files import FileService

router = APIRouter(prefix="/opportunities", tags=["opportunities"])
attachments_router = APIRouter(tags=["attachments"])

opp_dao = OpportunityDAO()
profile_dao = ProfileDAO()
work_experience_dao = WorkExperienceDAO()
comment_dao = CommentDAO()
attach_dao = AttachmentDAO()
agent_run_dao = AgentRunDAO()
files = FileService(ROOT / get_attachment_path())


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


@router.delete("/{opportunity_id}", status_code=204)
def delete_opportunity(opportunity_id: str):
    """Soft-delete an opportunity by closing its current version."""
    opp = opp_dao.get(opportunity_id)
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    opp_dao.delete(opportunity_id)


@router.get("/{opportunity_id}/agent-runs", response_model=List[AgentRun])
def list_opportunity_agent_runs(opportunity_id: str):
    """Return active agent runs for this opportunity."""
    opp = opp_dao.get(opportunity_id)
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return agent_run_dao.list_active_for_opportunity(opportunity_id)


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
    opportunity = opp_dao.get(opportunity_id)
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    profile = profile_dao.get()
    work_experiences = work_experience_dao.list_for_profile(profile.id) if profile else []

    run = agent_run_dao.create("source-opportunity.md", opportunity_id)
    opp_dao.set_sourcing_started(opportunity_id, run.id)

    async def _run():
        try:
            result = await claude.source_opportunity(opportunity, profile, work_experiences, run_id=run.id)
            sourced = result.output
        except (ClaudeError, asyncio.CancelledError):
            opp_dao.set_sourcing_completed(opportunity_id)
            return
        avatar_url = sourced.pop("avatar_url", None)
        updates = {k: v for k, v in sourced.items() if v is not None}
        typed = _parse_version_fields(updates)
        enriched = opportunity.model_copy(update={
            "active_version": opportunity.active_version.model_copy(update=typed)
        })
        opp_dao.update(opportunity_id, enriched.active_version)
        if avatar_url:
            opp_dao.set_avatar_url(opportunity_id, avatar_url)
        opp_dao.set_sourcing_completed(opportunity_id)

    asyncio.create_task(_run())
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
    for run in agent_run_dao.list_active_for_opportunity(opportunity_id):
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
    profile = profile_dao.get()
    work_experiences = work_experience_dao.list_for_profile(profile.id) if profile else []

    run = agent_run_dao.create("generate-attachment.md", opportunity_id)

    async def _generate():
        try:
            result = await claude.generate_markdown_attachment("cover_letter", opportunity, profile, work_experiences, run_id=run.id)
            md_content = result.output
        except (ClaudeError, asyncio.CancelledError):
            return

        file_path = f"{opportunity_id}/cover_letter.pdf"
        try:
            files.write_pdf(file_path, md_content)
        except RuntimeError:
            return

        attach_dao.create(
            opportunity_id=opportunity_id,
            attachment_type=AttachmentType.MOTIVATION,
            file_path=file_path,
            file_type="application/pdf",
            title=f"Cover Letter \u2013 {opportunity.active_version.title}",
        )

    asyncio.create_task(_generate())
    return {"run_id": run.id}


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
    return FileResponse(path=full_path, filename=full_path.name, media_type=attachment.file_type)
