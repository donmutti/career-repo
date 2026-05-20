"""Comment DTOs."""

from pydantic import BaseModel


class CreateCommentRequestDto(BaseModel):
    body: str


class UpdateCommentRequestDto(BaseModel):
    body: str
