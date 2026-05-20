"""Resume endpoints."""
import asyncio
import uuid
from pathlib import Path
from typing import List

from fastapi import APIRouter, HTTPException, UploadFile
from fastapi.responses import FileResponse

from ...config import ROOT, get_resumes_path
from ...db import ProfileDAO, ResumeDAO, WorkExperienceDAO, AgentRunDAO
from ...models.types import Resume
from ...services.ai import ClaudeService, ClaudeError

router = APIRouter(prefix="/profile/resumes", tags=["profile"])

profile_dao = ProfileDAO()
resume_dao = ResumeDAO()
we_dao = WorkExperienceDAO()
agent_run_dao = AgentRunDAO()
claude = ClaudeService(agent_run_dao)

RESUMES_DIR = ROOT / get_resumes_path()
MAX_RESUME_SIZE = 20 * 1024 * 1024  # 20MB
ALLOWED_EXTENSIONS = {'.pdf', '.doc', '.docx'}


@router.get("", response_model=List[Resume])
def list_resumes():
    profile = profile_dao.get()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return resume_dao.list_for_profile(profile.id)


@router.post("", response_model=Resume)
async def upload_resume(file: UploadFile):
    profile = profile_dao.get()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    original_name = file.filename or "resume"
    suffix = Path(original_name).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type not allowed. Use PDF, DOC, or DOCX.")

    data = await file.read()
    if len(data) > MAX_RESUME_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Maximum size is 20 MB.")

    RESUMES_DIR.mkdir(parents=True, exist_ok=True)
    file_name = f"{uuid.uuid4()}{suffix}"
    (RESUMES_DIR / file_name).write_bytes(data)

    return resume_dao.create(profile.id, file_name, original_name)


@router.get("/{resume_id}", response_model=Resume)
def get_resume(resume_id: str):
    resume = resume_dao.get(resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume


@router.get("/{resume_id}/file/{filename:path}")
def get_resume_file(resume_id: str, filename: str):
    resume = resume_dao.get(resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    path = RESUMES_DIR / resume.file_name
    if not path.exists():
        raise HTTPException(status_code=404, detail="Resume file not found")
    return FileResponse(path)


@router.delete("/{resume_id}", status_code=204)
def delete_resume(resume_id: str):
    resume = resume_dao.get(resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    path = RESUMES_DIR / resume.file_name
    if path.exists():
        path.unlink()
    resume_dao.delete(resume_id)


@router.get("/parse-work-experience/active")
def get_active_parse():
    """Return the active parse-work-experience run ID if one is in progress, else null."""
    for run in agent_run_dao.list_active():
        if run.agent == "parse-work-experience-from-resume.md":
            return {"run_id": run.id}
    return {"run_id": None}


@router.post("/{resume_id}/parse-work-experience", status_code=202)
async def parse_work_experience(resume_id: str):
    """Parse work experience from a resume using AI. Runs in background; poll agent run for completion."""
    resume = resume_dao.get(resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    profile = profile_dao.get()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    path = RESUMES_DIR / resume.file_name
    if not path.exists():
        raise HTTPException(status_code=404, detail="Resume file not found")

    suffix = path.suffix.lower()
    try:
        if suffix == ".pdf":
            import pypdf
            reader = pypdf.PdfReader(str(path))
            resume_text = "\n".join(page.extract_text() or "" for page in reader.pages)
        elif suffix in (".doc", ".docx"):
            import docx
            doc = docx.Document(str(path))
            resume_text = "\n".join(p.text for p in doc.paragraphs)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {suffix}")
    except ImportError as e:
        raise HTTPException(status_code=500, detail=f"Missing dependency: {e}")

    if not resume_text.strip():
        raise HTTPException(status_code=422, detail="Could not extract text from resume")

    run = agent_run_dao.create("parse-work-experience-from-resume.md", None)

    async def _run():
        try:
            result = await claude.parse_work_experience_from_resume(resume_text, run_id=run.id)
        except (ClaudeError, asyncio.CancelledError):
            return
        entries = [e for e in (result.output if isinstance(result.output, list) else []) if e.get("company") and e.get("role")]
        if not entries:
            return
        for existing in we_dao.list_for_profile(profile.id):
            we_dao.delete(existing.id)
        for entry in entries:
            we_dao.create(
                profile.id,
                entry["company"],
                entry["role"],
                entry.get("start_date"),
                entry.get("end_date"),
                entry.get("description"),
                entry.get("skills"),
            )

    asyncio.create_task(_run())
    return {"run_id": run.id}
