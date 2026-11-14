from datetime import UTC, datetime
from enum import IntEnum, StrEnum
from uuid import UUID

from src.domain.common.entidade_tenant import EntidadeTenant
from src.domain.common.exceptions import ConflictException, InvalidInputException


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


# Spec 073: os Status em que um caso anda pela correção, na ordem do fluxo.
STATUS_DA_CORRECAO = (
    StatusCasoTeste.IN_FIXES,
    StatusCasoTeste.IN_PROGRESS,
    StatusCasoTeste.IN_REVIEW,
    StatusCasoTeste.IN_VALIDATION,
)


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
        # Spec 072: quem corrige as falhas do SDF; `dev_fix_em` em UTC sem fuso.
        self.dev_fix_id: UUID | None = None
        self.dev_fix_em: datetime | None = None
        # Spec 073: quantas vezes o caso voltou de In Validation para In Fixes, e quando a tentativa
        # atual entrou em In Review (UTC sem fuso).
        self.tentativa_correcao = 0
        self.correcao_em_revisao_em: datetime | None = None
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
            self._aplicar_status(StatusCasoTeste.IN_FIXES)
        elif modelos_ids and all(resultados.get(modelo_id) == "PASS" for modelo_id in modelos_ids):
            self._aplicar_status(StatusCasoTeste.DONE)

    def definir_dev_fix(self, usuario_id: UUID | None) -> None:
        """Escolhe, troca ou remove o Dev Fix (spec 072, RN-17 e RN-18): Status e responsável
        ficam como estão. Repetir o mesmo dev não muda a data."""
        if usuario_id == self.dev_fix_id:
            return
        self.dev_fix_id = usuario_id
        self.dev_fix_em = None if usuario_id is None else datetime.now(UTC).replace(tzinfo=None)

    def aplicar_resultado_sdf(self, sem_falha: bool, falha_no_relatorio: bool) -> None:
        """Status pelo relatório SDF importado (specs 066 e 072).

        `sem_falha`: o último resultado de cada device do projeto não é falha. Só um caso em
        validação muda de Status (RN-05); fora dela o relatório grava o resultado no histórico e
        quem move o caso é uma pessoa.
        """
        if self.status is not StatusCasoTeste.IN_VALIDATION:
            return
        if sem_falha:
            self._aplicar_status(StatusCasoTeste.DONE)
        elif falha_no_relatorio:
            self._aplicar_status(StatusCasoTeste.IN_FIXES)

    def reabrir_por_regressao(self) -> bool:
        """Spec 076, RN-01: uma falha do SDF num caso Done reabre a correção numa nova tentativa.

        Só o incremento fica fora do `_aplicar_status`: a gestão mover um caso Done para In Fixes na
        mão não abre tentativa.
        """
        if self.status is not StatusCasoTeste.DONE:
            return False
        self.tentativa_correcao += 1
        self._aplicar_status(StatusCasoTeste.IN_FIXES)
        return True

    def desfazer_resultado_sdf(
        self, status_aplicado: StatusCasoTeste, status_anterior: StatusCasoTeste | None = None
    ) -> bool:
        # Quem chama confere, pela auditoria, que ninguém moveu o caso depois da importação.
        if self.status is not status_aplicado:
            return False
        # A volta para In Fixes que a importação abriu deixa de contar como tentativa (spec 073).
        if status_aplicado is StatusCasoTeste.IN_FIXES and self.tentativa_correcao > 0:
            self.tentativa_correcao -= 1
        # Importações anteriores à spec 076 não guardam o Status anterior: era sempre In Validation.
        self.status = status_anterior or StatusCasoTeste.IN_VALIDATION
        return True

    def em_correcao(self) -> bool:
        """Spec 073: o caso já voltou para In Fixes ao menos uma vez e ainda anda pela correção."""
        return self.tentativa_correcao > 0 and self.status in STATUS_DA_CORRECAO

    def mudar_status_da_correcao(self, status: StatusCasoTeste) -> None:
        """Mudança de Status pela My Fixes (spec 073, RN-10 e CA-09): só os Status da correção."""
        status = StatusCasoTeste(status)
        if status not in STATUS_DA_CORRECAO:
            raise InvalidInputException(
                "Na correção, o Status só pode ser In Fixes, In Progress, In Review ou "
                "In Validation."
            )
        if not self.em_correcao():
            raise ConflictException("O Test Case não está em correção.")
        self._mudar_status(status, None)

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
        self._aplicar_status(status)

    def _aplicar_status(self, status: StatusCasoTeste) -> None:
        """Muda o Status e grava as datas e a tentativa que dependem dele (specs 065 e 073)."""
        if status is StatusCasoTeste.IN_FIXES and self.status is not StatusCasoTeste.IN_FIXES:
            if self.status is StatusCasoTeste.IN_VALIDATION:
                self.tentativa_correcao += 1
            self.correcao_em_revisao_em = None
        elif status is StatusCasoTeste.IN_REVIEW and self.status is not StatusCasoTeste.IN_REVIEW:
            agora = datetime.now(UTC).replace(tzinfo=None)
            # Spec 065: só a primeira entrada em In Review marca o fim do código.
            if self.code_done_em is None:
                self.code_done_em = agora
            # Spec 073: a primeira entrada em In Review da tentativa atual é a End Date da correção.
            if self.tentativa_correcao > 0 and self.correcao_em_revisao_em is None:
                self.correcao_em_revisao_em = agora
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
