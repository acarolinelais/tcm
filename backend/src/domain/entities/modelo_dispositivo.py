from uuid import UUID

from src.domain.common.entidade_tenant import EntidadeTenant


class ModeloDispositivo(EntidadeTenant):
    NOME_MAX_LENGTH = 100

    def __init__(self, unidade_id: UUID, nome: str) -> None:
        super().__init__(unidade_id)
        self.atualizar_nome(nome)

    def atualizar_nome(self, nome: str) -> None:
        normalizado = nome.strip()
        if not normalizado:
            raise ValueError("Nome do modelo é obrigatório.")
        if len(normalizado) > self.NOME_MAX_LENGTH:
            raise ValueError(
                f"Nome do modelo deve ter no máximo {self.NOME_MAX_LENGTH} caracteres."
            )
        self.nome = normalizado
