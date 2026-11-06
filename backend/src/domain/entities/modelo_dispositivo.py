from uuid import UUID

from src.domain.common.entidade_tenant import EntidadeTenant


class ModeloDispositivo(EntidadeTenant):
    NOME_MAX_LENGTH = 100
    DESCRICAO_MAX_LENGTH = 100

    def __init__(self, unidade_id: UUID, nome: str, descricao: str | None = None) -> None:
        super().__init__(unidade_id)
        self.atualizar_nome(nome)
        self.atualizar_descricao(descricao)

    def atualizar_nome(self, nome: str) -> None:
        normalizado = nome.strip()
        if not normalizado:
            raise ValueError("Nome do modelo é obrigatório.")
        if len(normalizado) > self.NOME_MAX_LENGTH:
            raise ValueError(
                f"Nome do modelo deve ter no máximo {self.NOME_MAX_LENGTH} caracteres."
            )
        self.nome = normalizado

    def atualizar_descricao(self, descricao: str | None) -> None:
        """Descrição opcional: texto vazio ou só com espaços vira `None`."""
        normalizada = (descricao or "").strip()
        if len(normalizada) > self.DESCRICAO_MAX_LENGTH:
            raise ValueError(
                f"Descrição do modelo deve ter no máximo {self.DESCRICAO_MAX_LENGTH} caracteres."
            )
        self.descricao = normalizada or None
