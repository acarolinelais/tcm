from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from src.domain.common.paged_result import PagedResult
from src.domain.queries.form_factor_linha import FormFactorLinha
from src.domain.queries.modelo_do_projeto import ModeloDoProjeto


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


class FormFactorResponse(BaseModel):
    modelos: list[FormFactorModeloResponse]
    items: list[FormFactorLinhaResponse]
    page: int
    page_size: int
    total_count: int
    total_pages: int


def to_response(
    modelos: tuple[ModeloDoProjeto, ...], resultado: PagedResult[FormFactorLinha]
) -> FormFactorResponse:
    return FormFactorResponse(
        modelos=[FormFactorModeloResponse(id=modelo.id, nome=modelo.nome) for modelo in modelos],
        items=[
            FormFactorLinhaResponse(
                caso_teste_id=linha.caso_teste_id,
                tc_id=linha.tc_id,
                responsavel_id=linha.responsavel_id,
                sdf_id=linha.sdf_id,
                data_reportada=linha.data_reportada,
                resultados=linha.resultados,
            )
            for linha in resultado.items
        ],
        page=resultado.page,
        page_size=resultado.page_size,
        total_count=resultado.total_count,
        total_pages=resultado.total_pages,
    )
