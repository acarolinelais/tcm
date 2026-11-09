from uuid import UUID

from src.domain.common.cor_avatar import CorAvatar
from src.domain.common.entidade_tenant import EntidadeTenant
from src.domain.common.idioma_preferido import IdiomaPreferido


class Usuario(EntidadeTenant):
    NOME_MAX_LENGTH = 150
    EMAIL_MAX_LENGTH = 254
    USER_ID_MAX_LENGTH = 150

    def __init__(
        self,
        unidade_id: UUID,
        nome: str,
        email: str,
        responsavel_id: UUID | None = None,
        user_id: str | None = None,
    ) -> None:
        super().__init__(unidade_id)
        self.atualizar(nome, email)
        self.definir_user_id(user_id)
        self.senha_hash: str | None = None
        self.senha_alteracao_obrigatoria = False
        self.perfil_id: UUID | None = None
        self.responsavel_id = responsavel_id
        self.auth_version = 0
        self.idioma_preferido = IdiomaPreferido.INGLES
        self.cor_avatar = CorAvatar.AZUL

    def atualizar(self, nome: str, email: str) -> None:
        self._nome = nome
        self._email = self.normalizar_email(email)

    def definir_user_id(self, user_id: str | None) -> None:
        self._user_id = self.normalizar_user_id(user_id)

    def definir_senha_hash(self, senha_hash: str) -> None:
        self.senha_hash = senha_hash

    def definir_idioma_preferido(self, idioma: IdiomaPreferido) -> None:
        self.idioma_preferido = idioma

    def definir_cor_avatar(self, cor: CorAvatar) -> None:
        self.cor_avatar = cor

    @property
    def nome(self) -> str:
        return self._nome

    @property
    def email(self) -> str:
        return self._email

    @property
    def user_id(self) -> str | None:
        return self._user_id

    @staticmethod
    def normalizar_email(email: str) -> str:
        return email.strip().lower()

    @staticmethod
    def normalizar_user_id(user_id: str | None) -> str | None:
        if user_id is None:
            return None
        normalizado = user_id.strip()
        return normalizado or None
