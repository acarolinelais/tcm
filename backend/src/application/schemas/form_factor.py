from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

from src.domain.common.paged_result import PagedResult
from src.domain.entities.rodada_form_factor import RodadaFormFactor
from src.domain.queries.form_factor_linha import (
    FormFactorExecucaoLinha,
    FormFactorLinha,
)
from src.domain.queries.modelo_do_projeto import ModeloDoProjeto
from src.domain.queries.rodada_form_factor_caso import RodadaFormFactorCaso


class FormFactorModeloResponse(BaseModel):
    id: UUID
    nome: str


class FormFactorLinhaResponse(BaseModel):
    caso_teste_id: UUID
    tc_id: str
    responsavel_id: UUID
    sdf_id: str | None
    data_reportada: datetime | None
    resultados: dict[UUID, str]
    backup_id: UUID | None = None
    rodada_pendente_id: UUID | None = None


class FormFactorCasoElegivelResponse(BaseModel):
    caso_teste_id: UUID
    tc_id: str
    responsavel_id: UUID
    backup_id: UUID | None


class FormFactorResponse(BaseModel):
    modelos: list[FormFactorModeloResponse]
    casos_elegiveis: list[FormFactorCasoElegivelResponse] = Field(default_factory=list)
    items: list[FormFactorLinhaResponse]
    page: int
    page_size: int
    total_count: int
    total_pages: int


class FormFactorExecucaoResponse(BaseModel):
    execucao_id: UUID
    caso_teste_id: UUID
    tc_id: str
    responsavel_id: UUID
    sdf_id: str | None
    data_reportada: datetime
    origem: str
    resultados: dict[UUID, str]
    rodada_id: UUID | None = None
    resultados_registrados: bool = True


class CriarRodadaFormFactorLoteRequest(BaseModel):
    sdf_id: str | None = Field(default=None, max_length=RodadaFormFactor.SDF_ID_MAX_LENGTH)

    # "before": o limite de tamanho vale para o valor já sem espaços; vazio é "sem SDF ID".
    @field_validator("sdf_id", mode="before")
    @classmethod
    def normalizar_sdf_id(cls, sdf_id: object) -> object:
        if isinstance(sdf_id, str):
            return sdf_id.strip() or None
        return sdf_id


class EnviarResultadosRodadaRequest(BaseModel):
    resultados: dict[UUID, Literal["PASS", "FAIL"]] = Field(default_factory=dict)


class RodadaFormFactorResponse(BaseModel):
    id: UUID
    projeto_id: UUID
    sdf_id: str | None
    created_at: datetime
    total_test_cases: int


class RodadaFormFactorCasoResponse(BaseModel):
    execucao_id: UUID
    caso_teste_id: UUID
    tc_id: str
    responsavel_id: UUID
    backup_id: UUID | None
    status: str
    resultados: dict[UUID, str]
    resultados_registrados: bool


class RodadaFormFactorCasosResponse(BaseModel):
    rodada: RodadaFormFactorResponse
    modelos: list[FormFactorModeloResponse]
    items: list[RodadaFormFactorCasoResponse]
    page: int
    page_size: int
    total_count: int
    total_pages: int


def to_rodada_response(rodada: RodadaFormFactor, total_test_cases: int) -> RodadaFormFactorResponse:
    return RodadaFormFactorResponse(
        id=rodada.id,
        projeto_id=rodada.projeto_id,
        sdf_id=rodada.sdf_id,
        created_at=rodada.created_at,
        total_test_cases=total_test_cases,
    )


def to_rodada_casos_response(
    rodada: RodadaFormFactor,
    resultado: PagedResult[RodadaFormFactorCaso],
    modelos: tuple[ModeloDoProjeto, ...],
) -> RodadaFormFactorCasosResponse:
    return RodadaFormFactorCasosResponse(
        rodada=to_rodada_response(rodada, resultado.total_count),
        modelos=[FormFactorModeloResponse(id=modelo.id, nome=modelo.nome) for modelo in modelos],
        items=[
            RodadaFormFactorCasoResponse(
                execucao_id=item.execucao_id,
                caso_teste_id=item.caso_teste_id,
                tc_id=item.tc_id,
                responsavel_id=item.responsavel_id,
                backup_id=item.backup_id,
                status=item.status,
                resultados=item.resultados,
                resultados_registrados=item.resultados_registrados,
            )
            for item in resultado.items
        ],
        page=resultado.page,
        page_size=resultado.page_size,
        total_count=resultado.total_count,
        total_pages=resultado.total_pages,
    )


class FormFactorResultadosResponse(BaseModel):
    modelos: list[FormFactorModeloResponse]
    items: list[FormFactorExecucaoResponse]
    page: int
    page_size: int
    total_count: int
    total_pages: int


class CriarRodadaFormFactorRequest(BaseModel):
    caso_teste_id: UUID
    resultados: dict[UUID, Literal["PASS", "FAIL"]] = Field(min_length=1)

    @model_validator(mode="after")
    def exigir_resultados(self):
        if not self.resultados:
            raise ValueError("Informe ao menos um resultado para a rodada.")
        return self


def to_response(
    modelos: tuple[ModeloDoProjeto, ...],
    resultado: PagedResult[FormFactorLinha],
    casos_elegiveis=(),
) -> FormFactorResponse:
    return FormFactorResponse(
        modelos=[FormFactorModeloResponse(id=modelo.id, nome=modelo.nome) for modelo in modelos],
        casos_elegiveis=[
            FormFactorCasoElegivelResponse(
                caso_teste_id=caso.id,
                tc_id=caso.tc_id,
                responsavel_id=caso.responsavel_id,
                backup_id=caso.backup_id,
            )
            for caso in casos_elegiveis
        ],
        items=[
            FormFactorLinhaResponse(
                caso_teste_id=linha.caso_teste_id,
                tc_id=linha.tc_id,
                responsavel_id=linha.responsavel_id,
                sdf_id=linha.sdf_id,
                data_reportada=linha.data_reportada,
                resultados=linha.resultados,
                backup_id=linha.backup_id,
                rodada_pendente_id=linha.rodada_pendente_id,
            )
            for linha in resultado.items
        ],
        page=resultado.page,
        page_size=resultado.page_size,
        total_count=resultado.total_count,
        total_pages=resultado.total_pages,
    )


def to_resultados_response(
    modelos: tuple[ModeloDoProjeto, ...],
    resultado: PagedResult[FormFactorExecucaoLinha],
) -> FormFactorResultadosResponse:
    return FormFactorResultadosResponse(
        modelos=[FormFactorModeloResponse(id=modelo.id, nome=modelo.nome) for modelo in modelos],
        items=[
            FormFactorExecucaoResponse(
                execucao_id=linha.execucao_id,
                caso_teste_id=linha.caso_teste_id,
                tc_id=linha.tc_id,
                responsavel_id=linha.responsavel_id,
                sdf_id=linha.sdf_id,
                data_reportada=linha.data_reportada,
                origem=linha.origem,
                resultados=linha.resultados,
                rodada_id=linha.rodada_id,
                resultados_registrados=linha.resultados_registrados,
            )
            for linha in resultado.items
        ],
        page=resultado.page,
        page_size=resultado.page_size,
        total_count=resultado.total_count,
        total_pages=resultado.total_pages,
    )
