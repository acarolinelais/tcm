from uuid import UUID

from src.domain.common.entidade_tenant import EntidadeTenant
from src.domain.common.idioma_preferido import IdiomaPreferido


class Usuario(EntidadeTenant):
    NOME_MAX_LENGTH = 150
    EMAIL_MAX_LENGTH = 254

    def __init__(
        self, unidade_id: UUID, nome: str, email: str, responsavel_id: UUID | None = None
    ) -> None:
        super().__init__(unidade_id)
        self.atualizar(nome, email)
        self.senha_hash: str | None = None
        self.senha_alteracao_obrigatoria = False
        self.perfil_id: UUID | None = None
        self.responsavel_id = responsavel_id
        self.auth_version = 0
        self.idioma_preferido = IdiomaPreferido.INGLES

    def atualizar(self, nome: str, email: str) -> None:
        self._nome = nome
        self._email = self.normalizar_email(email)

    def definir_senha_hash(self, senha_hash: str) -> None:
        self.senha_hash = senha_hash

    def definir_idioma_preferido(self, idioma: IdiomaPreferido) -> None:
        self.idioma_preferido = idioma

    @property
    def nome(self) -> str:
        return self._nome

    @property
    def email(self) -> str:
        return self._email

    @staticmethod
    def normalizar_email(email: str) -> str:
        return email.strip().lower()
