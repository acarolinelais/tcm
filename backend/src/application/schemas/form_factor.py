from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from src.domain.common.paged_result import PagedResult
from src.domain.queries.form_factor_linha import FormFactorLinha


class FormFactorLinhaResponse(BaseModel):
    tc_id: str
    sdf_id: str
    modelo_dispositivo_id: UUID
    modelo_nome: str
    resultado: str
    data_reportada: datetime
    one_ui: str


class FormFactorResponse(BaseModel):
    items: list[FormFactorLinhaResponse]
    page: int
    page_size: int
    total_count: int
    total_pages: int


def to_response(resultado: PagedResult[FormFactorLinha]) -> FormFactorResponse:
    return FormFactorResponse(
        items=[FormFactorLinhaResponse(**linha.__dict__) for linha in resultado.items],
        page=resultado.page,
        page_size=resultado.page_size,
        total_count=resultado.total_count,
        total_pages=resultado.total_pages,
    )
