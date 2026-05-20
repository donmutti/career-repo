"""Create profile DTO."""

from pydantic import BaseModel


class CreateProfileRequestDto(BaseModel):
    """Request to create a new profile."""

    full_name: str
