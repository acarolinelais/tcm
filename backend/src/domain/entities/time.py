from uuid import UUID

from src.domain.common.entidade_tenant import EntidadeTenant


class Time(EntidadeTenant):
    NOME_MAX_LENGTH = 150

    def __init__(
        self, unidade_id: UUID, setor_id: UUID, nome: str, gerente_id: UUID | None = None
    ) -> None:
        super().__init__(unidade_id)
        self.setor_id = setor_id
        self.nome = nome
        self.gerente_id = gerente_id
