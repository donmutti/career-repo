"""Update profile DTO."""

from typing import List, Optional

from pydantic import BaseModel

from ...types.models import WorkPermit


class UpdateProfileRequestDto(BaseModel):
    """Request to update a profile."""

    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    website_url: Optional[str] = None
    location: Optional[str] = None
    work_permits: Optional[List[WorkPermit]] = None
    job_preferences: Optional[str] = None
    job_dealbreakers: Optional[str] = None
    voice_settings: Optional[str] = None
    avatar_file_name: Optional[str] = None
