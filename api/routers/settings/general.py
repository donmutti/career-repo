"""GET/POST /settings/general"""

from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from api.config import get_runtime_model, set_config
from api.services.claude_cli import is_online, list_models

router = APIRouter(prefix="/settings", tags=["settings"])


class GeneralSettingsDto(BaseModel):
    claude_code_status: str  # "online" | "offline"
    model: Optional[str]
    available_models: list[str]


class GeneralSettingsPatch(BaseModel):
    model: Optional[str]


@router.get("/general", response_model=GeneralSettingsDto)
def get_general():
    return GeneralSettingsDto(
        claude_code_status="online" if is_online() else "offline",
        model=get_runtime_model(),
        available_models=list_models(),
    )


@router.post("/general", response_model=GeneralSettingsDto)
def post_general(patch: GeneralSettingsPatch):
    models = list_models()
    if patch.model is not None and patch.model not in models:
        raise HTTPException(status_code=400, detail=f"Unknown model: {patch.model}")
    set_config("runtime", "model", patch.model)
    return GeneralSettingsDto(
        claude_code_status="online" if is_online() else "offline",
        model=patch.model,
        available_models=models,
    )
