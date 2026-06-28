"""Opportunity aggregate models."""

from datetime import date, datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel

from ...base import EntityVersion, VersionedEntity


class OpportunityStatus(str, Enum):
    OPENED = "opened"
    STARTED = "started"
    COMPLETED = "completed"


class OpportunityType(str, Enum):
    JOB = "job"
    PROJECT = "project"
    EDUCATION = "education"
    NETWORKING = "networking"
    LEARNING = "learning"


class JobContractType(str, Enum):
    PERMANENT = "permanent"
    FIXED_TERM = "fixed_term"
    CONTRACTOR = "contractor"


class JobWorkMode(str, Enum):
    ONSITE = "onsite"
    REMOTE = "remote"
    HYBRID = "hybrid"


class JobPayPeriod(str, Enum):
    HOURLY = "hourly"
    DAILY = "daily"
    MONTHLY = "monthly"
    ANNUAL = "annual"
    MILESTONE = "milestone"


class ProjectType(str, Enum):
    PRODUCT = "product"
    SERVICE = "service"
    FEATURE = "feature"
    MILESTONE = "milestone"
    COMMUNITY = "community"
    EVENT = "event"
    OTHER = "other"


class EducationType(str, Enum):
    DEGREE = "degree"
    CERTIFICATION = "certification"
    COURSE = "course"
    WORKSHOP = "workshop"
    OTHER = "other"


class EducationLevel(str, Enum):
    BACHELOR = "bachelor"
    MASTER = "master"
    PHD = "phd"
    PROFESSIONAL = "professional"
    ASSOCIATE = "associate"
    OTHER = "other"


class NetworkingType(str, Enum):
    MEET = "meet"
    ATTEND = "attend"
    HOST = "host"


class LearningType(str, Enum):
    BOOK = "book"
    ARTICLE = "article"
    MEDIA = "media"
    REPOSITORY = "repository"
    STUDY = "study"
    OTHER = "other"


class OpportunityVersion(EntityVersion):
    """Versioned opportunity data — flat layout covering all types."""

    # Common fields
    status: OpportunityStatus
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    score: Optional[int] = None
    score_explanation: Optional[str] = None
    opened_on: date
    started_on: Optional[date] = None
    completed_on: Optional[date] = None
    closed_on: Optional[date] = None
    close_reason: Optional[str] = None
    is_starred: bool = False
    organization_name: Optional[str] = None
    parent_id: Optional[str] = None
    # Job-specific fields
    job_role: Optional[str] = None
    job_level: Optional[str] = None
    job_contract_type: Optional[JobContractType] = None
    job_work_mode: Optional[JobWorkMode] = None
    job_pay_period: Optional[JobPayPeriod] = None
    job_pay_currency: Optional[str] = None
    job_pay_min: Optional[float] = None
    job_pay_max: Optional[float] = None
    # Project-specific fields
    project_type: Optional[ProjectType] = None
    # Education-specific fields
    education_type: Optional[EducationType] = None
    education_level: Optional[EducationLevel] = None
    # Networking-specific fields
    networking_type: Optional[NetworkingType] = None
    networking_is_online: Optional[bool] = None
    networking_contact_info: Optional[str] = None
    # Learning-specific fields
    learning_type: Optional[LearningType] = None
    learning_duration: Optional[str] = None


class Opportunity(VersionedEntity[OpportunityVersion]):
    """Opportunity aggregate (root + active version)."""

    type: OpportunityType
    url: Optional[str] = None
    sourcing_started_at: Optional[datetime] = None
    sourcing_completed_at: Optional[datetime] = None
    sourcing_agent_run_id: Optional[str] = None
    avatar_url: Optional[str] = None


class OpportunitySimilarity(BaseModel):
    """Near-duplicate pair returned by GET /opportunities/{id}/similar."""

    id_a: str
    id_b: str
    similarity: float
    created_at: datetime
    updated_at: datetime
    title: Optional[str] = None
    organization_name: Optional[str] = None
    avatar_url: Optional[str] = None
