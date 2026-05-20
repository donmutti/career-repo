"""Comment entity."""

from ...base import EntityVersion, VersionedEntity


class CommentVersion(EntityVersion):
    """Comment version fields."""

    body: str


class Comment(VersionedEntity[CommentVersion]):
    """Comment on an opportunity."""

    opportunity_id: str
