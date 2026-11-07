from datetime import UTC, datetime
from enum import IntEnum, StrEnum
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


class NivelAutomacaoCasoTeste(IntEnum):
    """Automation Level: quanto do caso pode ser automatizado. O banco guarda só o número."""

    NAO_AUTOMATIZAVEL = 1
    PARCIALMENTE_AUTOMATIZAVEL = 2
    TOTALMENTE_AUTOMATIZAVEL = 3


class StatusCasoTeste(StrEnum):
    """Progresso do caso no projeto."""

    TO_DO = "To-Do"
    IN_PROGRESS = "InProgress"
    IN_REVIEW = "InReview"
    IN_VALIDATION = "InValidation"
    DONE = "Done"
    IN_FIXES = "InFixes"
    CANCELLED = "Cancelled"


class CasoTeste(EntidadeTenant):
    TC_ID_MAX_LENGTH = 120
    JUSTIFICATIVA_EXCLUSAO_MAX_LENGTH = 500
    # Textos da planilha (spec 028): só a importação os grava e nada os altera depois.
    TITLE_MAX_LENGTH = 500
    TEXTO_MAX_LENGTH = 10_000

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
        automation_level: NivelAutomacaoCasoTeste | None = None,
        justificativa_exclusao: str | None = None,
        title: str | None = None,
        precondition: str | None = None,
        procedure: str | None = None,
        expected_result: str | None = None,
    ) -> None:
        super().__init__(unidade_id)
        self.projeto_id = projeto_id
        self.tc_id = self._validar_tc_id(tc_id)
        self.category = CategoriaCasoTeste(category)
        self.difficulty = DificuldadeCasoTeste(difficulty)
        self.situation = SituacaoCasoTeste(situation)
        self.status = StatusCasoTeste(status)
        self.automation_level = (
            None if automation_level is None else NivelAutomacaoCasoTeste(automation_level)
        )
        self.responsavel_id = responsavel_id
        self.backup_id = backup_id
        # Os TCs excluídos antes da spec 026 não têm justificativa: a reidratação não a exige.
        self.justificativa_exclusao = justificativa_exclusao
        self.title = self._validar_texto(title, "Title", self.TITLE_MAX_LENGTH)
        self.precondition = self._validar_texto(
            precondition, "Test Precondition", self.TEXTO_MAX_LENGTH
        )
        self.procedure = self._validar_texto(procedure, "Test Procedure", self.TEXTO_MAX_LENGTH)
        self.expected_result = self._validar_texto(
            expected_result, "Expected Result", self.TEXTO_MAX_LENGTH
        )
        # Spec 065: datas gravadas pelo sistema, em UTC sem fuso; a reidratação as preenche.
        self.code_done_em: datetime | None = None
        self.all_passed_em: datetime | None = None
        # Na reidratação o backup pode faltar: transferir_para_backup() o deixa vazio.
        self._validar_responsaveis(responsavel_id, backup_id, exigir_backup=exigir_backup)

    def atualizar_campos_do_responsavel(
        self,
        status: StatusCasoTeste,
        category: CategoriaCasoTeste,
        difficulty: DificuldadeCasoTeste,
        situation: SituacaoCasoTeste | None = None,
        automation_level: NivelAutomacaoCasoTeste | None = None,
        justificativa_exclusao: str | None = None,
    ) -> None:
        # Valida tudo antes de atribuir: um valor inválido não deixa o caso pela metade.
        nova_category = CategoriaCasoTeste(category)
        nova_difficulty = DificuldadeCasoTeste(difficulty)
        nova_situation = None if situation is None else SituacaoCasoTeste(situation)
        novo_nivel = None if automation_level is None else NivelAutomacaoCasoTeste(automation_level)
        # _mudar_status valida a justificativa antes de mudar o Status (spec 026).
        self._mudar_status(StatusCasoTeste(status), justificativa_exclusao)
        self.category = nova_category
        self.difficulty = nova_difficulty
        if nova_situation is not None:
            self.situation = nova_situation
        # O nível não pode ser esvaziado por aqui: None significa "manter".
        if novo_nivel is not None:
            self.automation_level = novo_nivel

    def registrar_resultado_form_factor(
        self, resultados: dict[UUID, str], modelos_ids: set[UUID]
    ) -> None:
        # Só um TC em validação muda de Status; um TC excluído (ou que já saiu da validação por
        # outra rodada) guarda os resultados no histórico sem voltar ao fluxo.
        if self.status is not StatusCasoTeste.IN_VALIDATION:
            return
        if any(resultado == "FAIL" for resultado in resultados.values()):
            self.status = StatusCasoTeste.IN_FIXES
        elif modelos_ids and all(resultados.get(modelo_id) == "PASS" for modelo_id in modelos_ids):
            self.status = StatusCasoTeste.DONE

    def aplicar_resultado_sdf(self, tudo_pass: bool, fail_no_relatorio: bool) -> None:
        """Status pelo relatório SDF importado (spec 066, RN-04 a RN-07).

        `tudo_pass`: o último resultado de cada device do projeto é PASS. `fail_no_relatorio`: o
        resultado deste relatório é FAIL. Só um caso em validação muda de Status (RN-05); fora dela
        o relatório grava o resultado no histórico e quem move o caso é uma pessoa.
        """
        if self.status is not StatusCasoTeste.IN_VALIDATION:
            return
        if tudo_pass:
            self.status = StatusCasoTeste.DONE
        elif fail_no_relatorio:
            self.status = StatusCasoTeste.IN_FIXES

    def cancelar(self, justificativa_exclusao: str) -> None:
        self._mudar_status(StatusCasoTeste.CANCELLED, justificativa_exclusao)

    def _mudar_status(self, status: StatusCasoTeste, justificativa_exclusao: str | None) -> None:
        # Spec 026: entrar em Cancelled exige justificativa; sair a apaga; continuar mantém a atual.
        if status is StatusCasoTeste.CANCELLED and self.status is not StatusCasoTeste.CANCELLED:
            justificativa = (justificativa_exclusao or "").strip()
            if not justificativa:
                raise ValueError("Justificativa é obrigatória para excluir o Test Case.")
            if len(justificativa) > self.JUSTIFICATIVA_EXCLUSAO_MAX_LENGTH:
                raise ValueError(
                    f"Justificativa deve ter no máximo {self.JUSTIFICATIVA_EXCLUSAO_MAX_LENGTH} "
                    "caracteres."
                )
            self.justificativa_exclusao = justificativa
        elif status is not StatusCasoTeste.CANCELLED:
            self.justificativa_exclusao = None
        # Spec 065, RN-01 e RN-02: só a primeira entrada em In Review marca o fim do código.
        if (
            status is StatusCasoTeste.IN_REVIEW
            and self.status is not StatusCasoTeste.IN_REVIEW
            and self.code_done_em is None
        ):
            self.code_done_em = datetime.now(UTC).replace(tzinfo=None)
        self.status = status

    def atualizar_gerenciamento(
        self,
        responsavel_id: UUID,
        backup_id: UUID | None,
        situation: SituacaoCasoTeste,
        status: StatusCasoTeste,
        category: CategoriaCasoTeste,
        difficulty: DificuldadeCasoTeste,
        automation_level: NivelAutomacaoCasoTeste | None = None,
        justificativa_exclusao: str | None = None,
    ) -> None:
        self._validar_responsaveis(responsavel_id, backup_id, exigir_backup=False)
        self.responsavel_id = responsavel_id
        self.backup_id = backup_id
        self.situation = SituacaoCasoTeste(situation)
        self.atualizar_campos_do_responsavel(
            status,
            category,
            difficulty,
            automation_level=automation_level,
            justificativa_exclusao=justificativa_exclusao,
        )

    def transferir_para_backup(self) -> None:
        if self.backup_id is None:
            raise ValueError("O Test Case não possui backup para receber a transferência.")
        # Troca de papéis (spec 011, RN-17): o caso nunca fica sem backup; quem transferiu
        # passa a ser o backup.
        self.responsavel_id, self.backup_id = self.backup_id, self.responsavel_id

    @classmethod
    def _validar_tc_id(cls, tc_id: str) -> str:
        normalizado = tc_id.strip()
        if not normalizado:
            raise ValueError("TC ID é obrigatório.")
        if len(normalizado) > cls.TC_ID_MAX_LENGTH:
            raise ValueError(f"TC ID deve ter no máximo {cls.TC_ID_MAX_LENGTH} caracteres.")
        return normalizado

    @staticmethod
    def _validar_texto(texto: str | None, nome: str, maximo: int) -> str | None:
        # Só as pontas: as quebras de linha internas são o passo a passo do caso.
        normalizado = (texto or "").strip()
        if len(normalizado) > maximo:
            raise ValueError(f"{nome} deve ter no máximo {maximo} caracteres.")
        return normalizado or None

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
