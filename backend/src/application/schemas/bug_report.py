from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from src.domain.queries.bug_report import CasoComFalhas, FalhaSdf


class FalhaSdfResponse(BaseModel):
    modelo_dispositivo_id: UUID
    modelo_nome: str
    sdf_id: str | None
    resultado: str
    descricao: str | None
    data_execucao: datetime


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


def _falha_to_response(falha: FalhaSdf) -> FalhaSdfResponse:
    return FalhaSdfResponse(
        modelo_dispositivo_id=falha.modelo_dispositivo_id,
        modelo_nome=falha.modelo_nome,
        sdf_id=falha.sdf_id,
        resultado=falha.resultado,
        descricao=falha.descricao,
        data_execucao=falha.data_execucao,
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
    )
