from collections.abc import Sequence
from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel

from src.application.schemas.form_factor import FormFactorModeloResponse
from src.domain.common.paged_result import PagedResult
from src.domain.queries.historico_form_factor import CasoHistorico, LinhaHistoricoExecucao
from src.domain.queries.modelo_do_projeto import ModeloDoProjeto


class ResultadoNaDataResponse(BaseModel):
    execucao_id: UUID
    resultado: str
    sdf_id: str | None
    origem: str
    descricao: str | None = None


class ExecucaoNaDataResponse(ResultadoNaDataResponse):
    data_reportada: datetime


class CasoHistoricoResponse(BaseModel):
    caso_teste_id: UUID
    tc_id: str
    responsavel_id: UUID
    responsavel_identificador: str | None
    # SDF ID da execução mais recente de cada modelo, em qualquer data; sem execução, fica fora.
    ultimo_sdf_por_modelo: dict[UUID, str | None]
    resultados: dict[date, dict[UUID, ResultadoNaDataResponse]]


class HistoricoProjetoResponse(BaseModel):
    modelos: list[FormFactorModeloResponse]
    datas: list[date]
    items: list[CasoHistoricoResponse]
    page: int
    page_size: int
    total_count: int
    total_pages: int


class ResumoExecucoesResponse(BaseModel):
    caso_teste_id: UUID
    tc_id: str
    responsavel_identificador: str | None
    modelos: list[FormFactorModeloResponse]
    datas: list[date]
    resultados: dict[date, dict[UUID, list[ExecucaoNaDataResponse]]]


def _modelos_response(modelos: Sequence[ModeloDoProjeto]) -> list[FormFactorModeloResponse]:
    return [FormFactorModeloResponse(id=modelo.id, nome=modelo.nome) for modelo in modelos]


def _resultado(linha: LinhaHistoricoExecucao) -> ResultadoNaDataResponse:
    return ResultadoNaDataResponse(
        execucao_id=linha.execucao_id,
        resultado=linha.resultado,
        sdf_id=linha.sdf_id,
        origem=linha.origem,
        descricao=linha.descricao,
    )


def to_historico_response(
    modelos: Sequence[ModeloDoProjeto],
    datas: Sequence[date],
    casos: PagedResult[CasoHistorico],
    linhas: Sequence[LinhaHistoricoExecucao],
    ultimos_sdf: dict[UUID, dict[UUID, str | None]],
) -> HistoricoProjetoResponse:
    """`linhas` vêm da mais antiga para a mais recente.

    A última de cada caso, dia e modelo fica na célula (RN-07).
    """
    resultados: dict[UUID, dict[date, dict[UUID, ResultadoNaDataResponse]]] = {}
    for linha in linhas:
        por_dia = resultados.setdefault(linha.caso_teste_id, {}).setdefault(linha.dia, {})
        por_dia[linha.modelo_dispositivo_id] = _resultado(linha)
    return HistoricoProjetoResponse(
        modelos=_modelos_response(modelos),
        datas=list(datas),
        items=[
            CasoHistoricoResponse(
                caso_teste_id=caso.caso_teste_id,
                tc_id=caso.tc_id,
                responsavel_id=caso.responsavel_id,
                responsavel_identificador=caso.responsavel_identificador,
                ultimo_sdf_por_modelo=ultimos_sdf.get(caso.caso_teste_id, {}),
                resultados=resultados.get(caso.caso_teste_id, {}),
            )
            for caso in casos.items
        ],
        page=casos.page,
        page_size=casos.page_size,
        total_count=casos.total_count,
        total_pages=casos.total_pages,
    )


def to_resumo_response(
    caso: CasoHistorico,
    modelos: Sequence[ModeloDoProjeto],
    linhas: Sequence[LinhaHistoricoExecucao],
) -> ResumoExecucoesResponse:
    resultados: dict[date, dict[UUID, list[ExecucaoNaDataResponse]]] = {}
    for linha in linhas:
        resultados.setdefault(linha.dia, {}).setdefault(linha.modelo_dispositivo_id, []).append(
            ExecucaoNaDataResponse(
                execucao_id=linha.execucao_id,
                resultado=linha.resultado,
                sdf_id=linha.sdf_id,
                origem=linha.origem,
                descricao=linha.descricao,
                data_reportada=linha.data_reportada,
            )
        )
    return ResumoExecucoesResponse(
        caso_teste_id=caso.caso_teste_id,
        tc_id=caso.tc_id,
        responsavel_identificador=caso.responsavel_identificador,
        modelos=_modelos_response(modelos),
        datas=sorted(resultados),
        resultados=resultados,
    )
