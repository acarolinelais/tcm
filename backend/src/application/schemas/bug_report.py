from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from src.application.schemas.caso_teste import timestamp_utc
from src.domain.queries.bug_report import CasoComFalhas, FalhaSdf
from src.domain.queries.correcao_concluida import CorrecaoConcluida


class FalhaSdfResponse(BaseModel):
    modelo_dispositivo_id: UUID
    modelo_nome: str
    sdf_id: str | None
    resultado: str
    descricao: str | None
    data_execucao: datetime
    # Spec 073: tentativa de correção em que a falha entrou; nula nas anteriores.
    tentativa: int | None = None


class CasoComFalhasResponse(BaseModel):
    caso_teste_id: UUID
    tc_id: str
    status: str
    time_id: UUID
    responsavel_id: UUID
    responsavel_identificador: str | None
    backup_id: UUID | None
    dev_fix_id: UUID | None
    dev_fix_identificador: str | None
    falhas: list[FalhaSdfResponse]
    # Spec 073: tentativa de correção do caso e a End Date da tentativa atual (In Review).
    tentativa_correcao: int = 0
    correcao_em_revisao_em: datetime | None = None


def _falha_to_response(falha: FalhaSdf) -> FalhaSdfResponse:
    return FalhaSdfResponse(
        modelo_dispositivo_id=falha.modelo_dispositivo_id,
        modelo_nome=falha.modelo_nome,
        sdf_id=falha.sdf_id,
        resultado=falha.resultado,
        descricao=falha.descricao,
        data_execucao=falha.data_execucao,
        tentativa=falha.tentativa,
    )


def to_response(caso: CasoComFalhas) -> CasoComFalhasResponse:
    return CasoComFalhasResponse(
        caso_teste_id=caso.caso_teste_id,
        tc_id=caso.tc_id,
        status=caso.status,
        time_id=caso.time_id,
        responsavel_id=caso.responsavel_id,
        responsavel_identificador=caso.responsavel_identificador,
        backup_id=caso.backup_id,
        dev_fix_id=caso.dev_fix_id,
        dev_fix_identificador=caso.dev_fix_identificador,
        falhas=[_falha_to_response(falha) for falha in caso.falhas],
        tentativa_correcao=caso.tentativa_correcao,
        correcao_em_revisao_em=timestamp_utc(caso.correcao_em_revisao_em),
    )


class CorrecaoConcluidaResponse(BaseModel):
    """Uma linha da visão Concluídas da My Fixes (spec 076, RN-14)."""

    id: UUID
    caso_teste_id: UUID
    tc_id: str
    tentativa: int
    origem: str
    corretor_id: UUID | None
    corretor_identificador: str | None
    falha_em: datetime
    em_revisao_em: datetime | None
    fechada_em: datetime
    resultado: str
    dias_ate_corrigir: int


def to_correcao_concluida_response(correcao: CorrecaoConcluida) -> CorrecaoConcluidaResponse:
    return CorrecaoConcluidaResponse(
        id=correcao.id,
        caso_teste_id=correcao.caso_teste_id,
        tc_id=correcao.tc_id,
        tentativa=correcao.tentativa,
        origem=correcao.origem,
        corretor_id=correcao.corretor_id,
        corretor_identificador=correcao.corretor_identificador,
        falha_em=timestamp_utc(correcao.falha_em),
        # As três são UTC sem fuso no banco, como o dia, o filtro e os dias contados as tratam.
        em_revisao_em=timestamp_utc(correcao.em_revisao_em),
        fechada_em=timestamp_utc(correcao.fechada_em),
        resultado=correcao.resultado,
        dias_ate_corrigir=correcao.dias_ate_corrigir,
    )
