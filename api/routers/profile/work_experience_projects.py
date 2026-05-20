"""Work experience project endpoints."""

from typing import List

from fastapi import APIRouter, HTTPException

from ...db import WorkExperienceProjectDAO, WorkExperienceDAO
from ...models.types import WorkExperienceProject
from ...models.dtos.profile import CreateProjectDto, UpdateProjectDto

router = APIRouter(tags=["profile"])

project_dao = WorkExperienceProjectDAO()
we_dao = WorkExperienceDAO()


@router.get("/profile/work-experiences/{experience_id}/projects", response_model=List[WorkExperienceProject])
def list_projects(experience_id: str):
    return project_dao.list_for_experience(experience_id)


@router.post("/profile/work-experiences/{experience_id}/projects", response_model=WorkExperienceProject)
def create_project(experience_id: str, request: CreateProjectDto):
    we = we_dao.get(experience_id)
    if not we:
        raise HTTPException(status_code=404, detail="Work experience not found")
    return project_dao.create(experience_id, request.name, request.description, request.status, request.start_date, request.end_date)


@router.patch("/profile/work-experiences/projects/{project_id}", response_model=WorkExperienceProject)
def update_project(project_id: str, request: UpdateProjectDto):
    project = project_dao.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project_dao.update(project_id, **{k: v for k, v in request.model_dump().items() if v is not None})


@router.delete("/profile/work-experiences/projects/{project_id}", status_code=204)
def delete_project(project_id: str):
    project = project_dao.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project_dao.delete(project_id)
