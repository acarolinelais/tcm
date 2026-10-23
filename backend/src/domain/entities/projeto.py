from enum import StrEnum
from uuid import UUID

from src.domain.common.entidade_tenant import EntidadeTenant


class StatusProjeto(StrEnum):
    CREATED = "Created"
    TO_DO = "To Do"
    IN_PROGRESS = "InProgress"
    COMPLETED = "Completed"
    CANCELED = "Canceled"


class Projeto(EntidadeTenant):
    APP_MAX_LENGTH = 100
    ONE_UI_MAX_LENGTH = 40
    STATUS_MAX_LENGTH = 20

    def __init__(
        self,
        unidade_id: UUID,
        time_id: UUID,
        app: str,
        one_ui: str,
    ) -> None:
        super().__init__(unidade_id)
        self.time_id = time_id
        self.app = self._validar_valor(app, "App", self.APP_MAX_LENGTH)
        self.one_ui = self._validar_valor(one_ui, "One UI", self.ONE_UI_MAX_LENGTH)
        self.status = StatusProjeto.CREATED

    @property
    def nome(self) -> str:
        return f"{self.app} {self.one_ui}"

    def atualizar_status(self, status: StatusProjeto) -> None:
        self.status = StatusProjeto(status)

    @staticmethod
    def _validar_valor(valor: str, campo: str, limite: int) -> str:
        normalizado = valor.strip()
        if not normalizado:
            raise ValueError(f"{campo} é obrigatório.")
        if len(normalizado) > limite:
            raise ValueError(f"{campo} deve ter no máximo {limite} caracteres.")
        return normalizado
