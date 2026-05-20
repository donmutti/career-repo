from typing import Optional
from pydantic import BaseModel


class UpdateOpportunityRequestDto(BaseModel):
    status: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    score: Optional[int] = None
    score_explanation: Optional[str] = None
    opened_on: Optional[str] = None
    started_on: Optional[str] = None
    completed_on: Optional[str] = None
    closed_on: Optional[str] = None
    organization_name: Optional[str] = None
    parent_id: Optional[str] = None
    # Job-specific
    job_role: Optional[str] = None
    job_level: Optional[str] = None
    job_contract_type: Optional[str] = None
    job_work_mode: Optional[str] = None
    job_pay_period: Optional[str] = None
    job_pay_currency: Optional[str] = None
    job_pay_min: Optional[float] = None
    job_pay_max: Optional[float] = None
    # Project-specific
    project_type: Optional[str] = None
    # Education-specific
    education_type: Optional[str] = None
    education_level: Optional[str] = None
    # Networking-specific
    networking_type: Optional[str] = None
    networking_is_online: Optional[bool] = None
    networking_contact_info: Optional[str] = None
    # Learning-specific
    learning_type: Optional[str] = None
    learning_duration: Optional[str] = None
