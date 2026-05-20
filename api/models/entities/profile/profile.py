"""Profile entity."""

from typing import List, Optional

from ..base import EntityVersion, VersionedEntity
from ...types import WorkPermit


class ProfileVersion(EntityVersion):
    """Profile version fields."""

    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    website_url: Optional[str] = None
    location: Optional[str] = None
    work_permits: List[WorkPermit] = []
    job_preferences: Optional[str] = None
    job_dealbreakers: Optional[str] = None
    voice_settings: str = ""
    avatar_file_name: Optional[str] = None


class Profile(VersionedEntity[ProfileVersion]):
    """User profile with preferences."""

    pass
