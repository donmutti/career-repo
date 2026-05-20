"""Domain exceptions."""


class EntityNotFoundError(Exception):
    def __init__(self, entity_type: str, entity_id: str):
        super().__init__(f"{entity_type} {entity_id} not found")
