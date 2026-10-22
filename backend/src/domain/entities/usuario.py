from src.domain.common.entity_base import EntityBase


class Usuario(EntityBase):
    NOME_MAX_LENGTH = 150
    EMAIL_MAX_LENGTH = 254

    def __init__(self, nome: str, email: str) -> None:
        super().__init__()
        self.atualizar(nome, email)

    def atualizar(self, nome: str, email: str) -> None:
        self._nome = nome
        self._email = self.normalizar_email(email)

    @property
    def nome(self) -> str:
        return self._nome

    @property
    def email(self) -> str:
        return self._email

    @staticmethod
    def normalizar_email(email: str) -> str:
        return email.strip().lower()
