from uuid import UUID

from src.domain.common.entity_base import EntityBase


class EntidadeTenant(EntityBase):
    """Base para entidades presas a uma Unidade (o tenant, ADR 0013)."""

    def __init__(self, unidade_id: UUID) -> None:
        super().__init__()
        self.unidade_id = unidade_id
