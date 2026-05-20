"""Attachment entity."""

from enum import Enum
from typing import Optional

from ...base import BaseEntity


class AttachmentType(str, Enum):
    CV = "cv"
    MOTIVATION = "motivation"
    STUDY = "study"
    PORTFOLIO = "portfolio"
    OTHER = "other"


class Attachment(BaseEntity):
    """File attachment on an opportunity."""

    opportunity_id: str
    type: AttachmentType
    title: Optional[str] = None
    file_path: str
    file_type: str  # MIME type, e.g. application/pdf
