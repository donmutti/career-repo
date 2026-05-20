"""System and domain value types."""

from enum import Enum
from typing import Optional

from pydantic import BaseModel

# Currency is a free-form ISO 4217 code string (e.g. "USD", "EUR")
Currency = str


class WorkPermitType(str, Enum):
    CITIZENSHIP = "citizenship"
    RESIDENCY = "residency"
    VISA = "visa"
    OTHER = "other"


class WorkPermit(BaseModel):
    """Work permit attached to profile version."""

    type: WorkPermitType
    country: str
    description: Optional[str] = None


class WorkExperienceVersion(BaseModel):
    """Version fields for a work experience entry."""

    active_from: Optional[str] = None
    active_to: Optional[str] = None
    company: str
    role: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description: Optional[str] = None
    skills: Optional[str] = None


class WorkExperience(BaseModel):
    """Work experience standalone versioned entity."""

    id: str
    profile_id: str
    created_at: str
    active_version: WorkExperienceVersion


class WorkExperienceProject(BaseModel):
    """Project attached to a work experience entry."""

    id: Optional[str] = None
    work_experience_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class Resume(BaseModel):
    """Resume file attached to a profile."""
    id: str
    profile_id: str
    file_name: str
    original_name: str
    created_at: str
