"""GET/POST/PATCH /profile"""

import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile
from fastapi.responses import FileResponse

from ...config import ROOT, get_images_path
from ...db import ProfileDAO
from ...models import Profile, CreateProfileRequestDto, UpdateProfileRequestDto

router = APIRouter(prefix="/profile", tags=["profile"])

profile_dao = ProfileDAO()

IMAGES_DIR = ROOT / get_images_path()
MAX_AVATAR_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


@router.post("", response_model=Profile)
def create_profile(request: CreateProfileRequestDto):
    """Create a new user profile."""
    if profile_dao.get():
        raise HTTPException(status_code=409, detail="Profile already exists")
    profile_dao.create(request.full_name, request.job_preferences, request.voice_settings or "")
    return profile_dao.get()


@router.get("", response_model=Profile)
def get_profile():
    """Get the user's profile."""
    profile = profile_dao.get()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.patch("", response_model=Profile)
def update_profile(request: UpdateProfileRequestDto):
    """Update the user's profile."""
    profile = profile_dao.get()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    updated_version = profile.active_version.model_copy(update={
        k: getattr(request, k) for k in request.model_fields_set
    })
    return profile_dao.update(profile.id, updated_version)


@router.post("/avatar", response_model=Profile)
async def upload_avatar(file: UploadFile):
    """Upload a profile avatar image."""
    profile = profile_dao.get()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}. Allowed: jpeg, png, webp, gif")

    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file extension: {suffix}")

    data = await file.read()
    if len(data) > MAX_AVATAR_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Maximum size is {MAX_AVATAR_SIZE // (1024 * 1024)} MB")

    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    file_name = f"{uuid.uuid4()}{suffix}"
    (IMAGES_DIR / file_name).write_bytes(data)

    updated_version = profile.active_version.model_copy(update={"avatar_file_name": file_name})
    return profile_dao.update(profile.id, updated_version)


@router.get("/avatar")
def get_avatar():
    """Serve the profile avatar image."""
    profile = profile_dao.get()
    if not profile or not profile.active_version.avatar_file_name:
        raise HTTPException(status_code=404, detail="No avatar set")

    path = IMAGES_DIR / profile.active_version.avatar_file_name
    if not path.exists():
        raise HTTPException(status_code=404, detail="Avatar file not found")

    return FileResponse(path)
