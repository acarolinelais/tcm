from src.domain.common.entity_base import EntityBase


class Unidade(EntityBase):
    """A raiz do tenant (ADR 0013). Não estende EntidadeTenant: ela não pertence a si mesma."""

    NOME_MAX_LENGTH = 150

    def __init__(self, nome: str) -> None:
        super().__init__()
        self.nome = nome
