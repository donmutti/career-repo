from .base import ErrorDto
from .inbox import (
    ScanInboxRequestDto,
    ScanInboxResponseDto,
)
from .opportunity import (
    CreateOpportunityRequestDto,
    UpdateOpportunityRequestDto,
    CreateCommentRequestDto, UpdateCommentRequestDto,
    CreateAttachmentRequestDto,
)
from .profile import CreateProfileRequestDto, UpdateProfileRequestDto

__all__ = [
    "ErrorDto",
    "CreateProfileRequestDto", "UpdateProfileRequestDto",
    "CreateOpportunityRequestDto", "UpdateOpportunityRequestDto",
    "CreateCommentRequestDto", "UpdateCommentRequestDto",
    "CreateAttachmentRequestDto",
    "ScanInboxRequestDto", "ScanInboxResponseDto",
]
