"""Work experience DTOs."""

from typing import Optional

from pydantic import BaseModel


class CreateWorkExperienceDto(BaseModel):
    company: str
    role: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description: Optional[str] = None
    skills: Optional[str] = None


class UpdateWorkExperienceDto(BaseModel):
    company: Optional[str] = None
    role: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description: Optional[str] = None
    skills: Optional[str] = None


class CreateProjectDto(BaseModel):
    name: str
    description: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class UpdateProjectDto(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
