from datetime import date
from enum import StrEnum
from uuid import UUID

from src.domain.common.entidade_tenant import EntidadeTenant
from src.domain.common.exceptions import InvalidInputException


class StatusProjeto(StrEnum):
    CREATED = "Created"
    TO_DO = "To Do"
    IN_PROGRESS = "InProgress"
    COMPLETED = "Completed"
    CANCELED = "Canceled"


class Projeto(EntidadeTenant):
    NOME_MAX_LENGTH = 150
    APP_MAX_LENGTH = 100
    ONE_UI_MAX_LENGTH = 40
    STATUS_MAX_LENGTH = 20

    def __init__(
        self,
        unidade_id: UUID,
        time_id: UUID,
        app: str,
        one_ui: str,
        nome: str | None = None,
    ) -> None:
        super().__init__(unidade_id)
        self.time_id = time_id
        self.app = self._validar_valor(app, "App", self.APP_MAX_LENGTH)
        self.one_ui = self._validar_valor(one_ui, "One UI", self.ONE_UI_MAX_LENGTH)
        self.nome = self._validar_valor(
            nome or f"{self.app} {self.one_ui}", "Nome", self.NOME_MAX_LENGTH
        )
        self.status = StatusProjeto.CREATED
        self.data_planejada: date | None = None
        self.planejamento_iniciado_em: date | None = None

    def atualizar_status(self, status: StatusProjeto) -> None:
        self.status = StatusProjeto(status)

    def atualizar_dados(self, nome: str, app: str, one_ui: str, time_id: UUID) -> None:
        self.nome = self._validar_valor(nome, "Nome", self.NOME_MAX_LENGTH)
        self.app = self._validar_valor(app, "App", self.APP_MAX_LENGTH)
        self.one_ui = self._validar_valor(one_ui, "One UI", self.ONE_UI_MAX_LENGTH)
        self.time_id = time_id

    def definir_data_planejada(self, data: date | None, hoje: date) -> None:
        """Spec 071: definir ou mudar a data recomeça o planejamento hoje; `None` apaga os dois.
        Mandar a mesma data não muda nada, nem quando ela já ficou no passado (RN-09)."""
        if data == self.data_planejada:
            return
        if data is not None and data < hoje:
            raise InvalidInputException("A data planejada não pode estar no passado.")
        self.data_planejada = data
        self.planejamento_iniciado_em = None if data is None else hoje

    def desativar(self) -> None:
        self.ativo = False

    @staticmethod
    def _validar_valor(valor: str, campo: str, limite: int) -> str:
        normalizado = valor.strip()
        if not normalizado:
            raise ValueError(f"{campo} é obrigatório.")
        if len(normalizado) > limite:
            raise ValueError(f"{campo} deve ter no máximo {limite} caracteres.")
        return normalizado
