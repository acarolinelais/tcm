from datetime import datetime
from enum import StrEnum
from uuid import UUID

from src.domain.common.entidade_tenant import EntidadeTenant
from src.domain.common.exceptions import ConflictException


class OrigemCorrecao(StrEnum):
    VALIDACAO = "validacao"
    REGRESSAO = "regressao"


class ResultadoCorrecao(StrEnum):
    CORRIGIDA = "corrigida"
    FALHOU_DE_NOVO = "falhou_de_novo"
    ENCERRADA = "encerrada"


class Correcao(EntidadeTenant):
    """Uma tentativa de correção de um Test Case (spec 076, RN-08 a RN-10)."""

    def __init__(
        self,
        unidade_id: UUID,
        caso_teste_id: UUID,
        tentativa: int,
        origem: OrigemCorrecao,
        falha_em: datetime,
        aberta_por_importacao_id: UUID | None = None,
    ) -> None:
        super().__init__(unidade_id)
        if tentativa < 1:
            raise ValueError("A tentativa de correção começa em 1.")
        self.caso_teste_id = caso_teste_id
        self.tentativa = tentativa
        self.origem = OrigemCorrecao(origem)
        # Data da execução do SDF que falhou, em UTC sem fuso, como `execucoes_sdf.data_reportada`.
        self.falha_em = falha_em
        self.aberta_por_importacao_id = aberta_por_importacao_id
        self.em_revisao_em: datetime | None = None
        self.fechada_em: datetime | None = None
        self.resultado: ResultadoCorrecao | None = None
        # Enquanto aberta, o corretor é o atual do caso; fica gravado só quando fecha (RN-10).
        self.corretor_id: UUID | None = None
        self.fechada_por_importacao_id: UUID | None = None

    @property
    def aberta(self) -> bool:
        return self.resultado is None

    def fechar(
        self,
        resultado: ResultadoCorrecao,
        quando: datetime,
        corretor_id: UUID,
        em_revisao_em: datetime | None,
        importacao_id: UUID | None = None,
    ) -> None:
        if not self.aberta:
            raise ConflictException("Esta tentativa de correção já foi fechada.")
        self.resultado = ResultadoCorrecao(resultado)
        # Uma mudança manual abre com o horário de agora; um relatório de data anterior não pode
        # fechar antes da falha (os dias até corrigir nunca ficam negativos).
        self.fechada_em = max(quando, self.falha_em)
        self.corretor_id = corretor_id
        # Uma tentativa reaberta pelo desfazer guarda a End date; o caso já a perdeu (RN-06).
        self.em_revisao_em = em_revisao_em or self.em_revisao_em
        self.fechada_por_importacao_id = importacao_id

    def reabrir(self) -> None:
        """Desfaz o fechamento quando a importação que fechou a tentativa é desfeita (RN-06)."""
        self.resultado = None
        self.fechada_em = None
        self.corretor_id = None
        self.fechada_por_importacao_id = None
