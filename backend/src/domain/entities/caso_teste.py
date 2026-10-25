from enum import StrEnum
from uuid import UUID

from src.domain.common.entidade_tenant import EntidadeTenant


class CategoriaCasoTeste(StrEnum):
    A = "A"
    B = "B"
    C = "C"


class DificuldadeCasoTeste(StrEnum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"


class SituacaoCasoTeste(StrEnum):
    """TC Situation: origem do caso em relação a projetos anteriores."""

    NEW = "New"
    NEW_STEP = "New Step"
    WITHOUT_CHANGES = "Without Changes"


class StatusCasoTeste(StrEnum):
    """Progresso do caso no projeto."""

    TO_DO = "To-Do"
    IN_PROGRESS = "InProgress"
    IN_REVIEW = "InReview"
    IN_VALIDATION = "InValidation"
    DONE = "Done"
    CANCELLED = "Cancelled"


class CasoTeste(EntidadeTenant):
    TC_ID_MAX_LENGTH = 120

    def __init__(
        self,
        unidade_id: UUID,
        projeto_id: UUID,
        tc_id: str,
        category: CategoriaCasoTeste,
        difficulty: DificuldadeCasoTeste,
        responsavel_id: UUID,
        backup_id: UUID | None,
        situation: SituacaoCasoTeste,
        status: StatusCasoTeste = StatusCasoTeste.TO_DO,
        *,
        exigir_backup: bool = True,
    ) -> None:
        super().__init__(unidade_id)
        self.projeto_id = projeto_id
        self.tc_id = self._validar_tc_id(tc_id)
        self.category = CategoriaCasoTeste(category)
        self.difficulty = DificuldadeCasoTeste(difficulty)
        self.situation = SituacaoCasoTeste(situation)
        self.status = StatusCasoTeste(status)
        self.responsavel_id = responsavel_id
        self.backup_id = backup_id
        # Na reidratação o backup pode faltar: transferir_para_backup() o deixa vazio.
        self._validar_responsaveis(responsavel_id, backup_id, exigir_backup=exigir_backup)

    def atualizar_campos_do_responsavel(
        self,
        status: StatusCasoTeste,
        category: CategoriaCasoTeste,
        difficulty: DificuldadeCasoTeste,
    ) -> None:
        self.status = StatusCasoTeste(status)
        self.category = CategoriaCasoTeste(category)
        self.difficulty = DificuldadeCasoTeste(difficulty)

    def registrar_resultado_form_factor(
        self, resultados: dict[UUID, str], modelos_ids: set[UUID]
    ) -> None:
        if any(resultado == "FAIL" for resultado in resultados.values()):
            self.status = StatusCasoTeste.IN_REVIEW
        elif modelos_ids and all(resultados.get(modelo_id) == "PASS" for modelo_id in modelos_ids):
            self.status = StatusCasoTeste.DONE
        elif self.status is not StatusCasoTeste.CANCELLED:
            self.status = StatusCasoTeste.IN_VALIDATION

    def cancelar(self) -> None:
        self.status = StatusCasoTeste.CANCELLED

    def atualizar_gerenciamento(
        self,
        responsavel_id: UUID,
        backup_id: UUID | None,
        situation: SituacaoCasoTeste,
        status: StatusCasoTeste,
        category: CategoriaCasoTeste,
        difficulty: DificuldadeCasoTeste,
    ) -> None:
        self._validar_responsaveis(responsavel_id, backup_id, exigir_backup=False)
        self.responsavel_id = responsavel_id
        self.backup_id = backup_id
        self.situation = SituacaoCasoTeste(situation)
        self.atualizar_campos_do_responsavel(status, category, difficulty)

    def transferir_para_backup(self) -> None:
        if self.backup_id is None:
            raise ValueError("O Test Case não possui backup para receber a transferência.")
        self.responsavel_id = self.backup_id
        self.backup_id = None

    @classmethod
    def _validar_tc_id(cls, tc_id: str) -> str:
        normalizado = tc_id.strip()
        if not normalizado:
            raise ValueError("TC ID é obrigatório.")
        if len(normalizado) > cls.TC_ID_MAX_LENGTH:
            raise ValueError(f"TC ID deve ter no máximo {cls.TC_ID_MAX_LENGTH} caracteres.")
        return normalizado

    @staticmethod
    def _validar_responsaveis(
        responsavel_id: UUID,
        backup_id: UUID | None,
        exigir_backup: bool,
    ) -> None:
        if responsavel_id is None:
            raise ValueError("Responsável principal é obrigatório.")
        if exigir_backup and backup_id is None:
            raise ValueError("Backup é obrigatório na criação ou atribuição do Test Case.")
        if backup_id is not None and responsavel_id == backup_id:
            raise ValueError("Responsável principal e backup devem ser pessoas distintas.")
