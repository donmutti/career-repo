"""Attachment DTOs."""

from typing import Optional

from pydantic import BaseModel

from ....entities.opportunity.meta.attachment import AttachmentType


class CreateAttachmentRequestDto(BaseModel):
    """Request to create an attachment."""

    attachment_type: AttachmentType = AttachmentType.OTHER
    file_path: str
    file_type: str  # MIME type, e.g. application/pdf
    title: Optional[str] = None
