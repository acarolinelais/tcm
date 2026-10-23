from uuid import UUID

from src.domain.common.entidade_tenant import EntidadeTenant


class Setor(EntidadeTenant):
    NOME_MAX_LENGTH = 150

    def __init__(self, unidade_id: UUID, nome: str) -> None:
        super().__init__(unidade_id)
        self.nome = nome
