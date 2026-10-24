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
    TO_DO = "To-Do"
    IN_PROGRESS = "InProgress"
    IN_REVIEW = "InReview"
    PASS = "Pass"
    FAIL = "Fail"


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
        situation: SituacaoCasoTeste = SituacaoCasoTeste.TO_DO,
        *,
        exigir_backup: bool = True,
    ) -> None:
        super().__init__(unidade_id)
        self.projeto_id = projeto_id
        self.tc_id = self._validar_tc_id(tc_id)
        self.category = CategoriaCasoTeste(category)
        self.difficulty = DificuldadeCasoTeste(difficulty)
        self.situation = SituacaoCasoTeste(situation)
        self.responsavel_id = responsavel_id
        self.backup_id = backup_id
        # Na reidratação o backup pode faltar: transferir_para_backup() o deixa vazio.
        self._validar_responsaveis(responsavel_id, backup_id, exigir_backup=exigir_backup)

    def atualizar_campos_do_responsavel(
        self,
        situation: SituacaoCasoTeste,
        category: CategoriaCasoTeste,
        difficulty: DificuldadeCasoTeste,
    ) -> None:
        self.situation = SituacaoCasoTeste(situation)
        self.category = CategoriaCasoTeste(category)
        self.difficulty = DificuldadeCasoTeste(difficulty)

    def atualizar_gerenciamento(
        self,
        responsavel_id: UUID,
        backup_id: UUID | None,
        situation: SituacaoCasoTeste,
        category: CategoriaCasoTeste,
        difficulty: DificuldadeCasoTeste,
    ) -> None:
        self._validar_responsaveis(responsavel_id, backup_id, exigir_backup=False)
        self.responsavel_id = responsavel_id
        self.backup_id = backup_id
        self.atualizar_campos_do_responsavel(situation, category, difficulty)

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
