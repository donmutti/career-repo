"""PATCH /comments/{comment_id}, DELETE /comments/{comment_id}"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from ....db import CommentDAO
from ....models import Comment, CommentVersion, UpdateCommentRequestDto

router = APIRouter(prefix="/comments", tags=["comments"])

comment_dao = CommentDAO()


@router.patch("/{comment_id}", response_model=Comment)
def update_comment(comment_id: str, request: UpdateCommentRequestDto):
    """Update a comment."""
    if not comment_dao.get(comment_id):
        raise HTTPException(status_code=404, detail="Comment not found")
    return comment_dao.update(comment_id, CommentVersion(body=request.body))


@router.delete("/{comment_id}", status_code=204)
def delete_comment(comment_id: str):
    """Delete a comment."""
    if not comment_dao.get(comment_id):
        raise HTTPException(status_code=404, detail="Comment not found")
    comment_dao.delete(comment_id)
    return Response(status_code=204)
