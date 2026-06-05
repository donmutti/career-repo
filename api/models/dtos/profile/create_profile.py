"""Create profile DTO."""

from pydantic import BaseModel


from typing import Optional


class CreateProfileRequestDto(BaseModel):
    """Request to create a new profile."""

    full_name: str
    job_preferences: Optional[str] = None
    voice_settings: Optional[str] = None
