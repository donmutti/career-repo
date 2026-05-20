"""Work experience CRUD endpoints."""

from typing import List

from fastapi import APIRouter, HTTPException

from ...db import ProfileDAO, WorkExperienceDAO
from ...models.types import WorkExperience
from ...models.dtos.profile import CreateWorkExperienceDto, UpdateWorkExperienceDto

router = APIRouter(tags=["profile"])

profile_dao = ProfileDAO()
we_dao = WorkExperienceDAO()


@router.get("/profile/work-experiences", response_model=List[WorkExperience])
def list_work_experiences():
    profile = profile_dao.get()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return we_dao.list_for_profile(profile.id)


@router.post("/profile/work-experiences", response_model=WorkExperience)
def create_work_experience(request: CreateWorkExperienceDto):
    profile = profile_dao.get()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return we_dao.create(
        profile.id,
        request.company,
        request.role,
        request.start_date,
        request.end_date,
        request.description,
        request.skills,
    )


@router.get("/profile/work-experiences/{experience_id}", response_model=WorkExperience)
def get_work_experience(experience_id: str):
    we = we_dao.get(experience_id)
    if not we:
        raise HTTPException(status_code=404, detail="Work experience not found")
    return we


@router.patch("/profile/work-experiences/{experience_id}", response_model=WorkExperience)
def update_work_experience(experience_id: str, request: UpdateWorkExperienceDto):
    we = we_dao.get(experience_id)
    if not we:
        raise HTTPException(status_code=404, detail="Work experience not found")
    return we_dao.update(
        experience_id,
        **{k: v for k, v in request.model_dump().items() if k in request.model_fields_set},
    )


@router.delete("/profile/work-experiences/{experience_id}", status_code=204)
def delete_work_experience(experience_id: str):
    we = we_dao.get(experience_id)
    if not we:
        raise HTTPException(status_code=404, detail="Work experience not found")
    we_dao.delete(experience_id)
