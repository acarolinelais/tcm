from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from src.domain.queries.bug_report import FalhaAberta


class FalhaAbertaResponse(BaseModel):
    caso_teste_id: UUID
    tc_id: str
    titulo: str | None
    status: str
    projeto_id: UUID
    projeto_nome: str
    time_id: UUID
    modelo_dispositivo_id: UUID
    modelo_nome: str
    sdf_id: str | None
    motivo: str | None
    data_execucao: datetime
    responsavel_id: UUID
    responsavel_identificador: str | None
    backup_id: UUID | None


def to_response(falha: FalhaAberta) -> FalhaAbertaResponse:
    return FalhaAbertaResponse(
        caso_teste_id=falha.caso_teste_id,
        tc_id=falha.tc_id,
        titulo=falha.titulo,
        status=falha.status,
        projeto_id=falha.projeto_id,
        projeto_nome=falha.projeto_nome,
        time_id=falha.time_id,
        modelo_dispositivo_id=falha.modelo_dispositivo_id,
        modelo_nome=falha.modelo_nome,
        sdf_id=falha.sdf_id,
        motivo=falha.motivo,
        data_execucao=falha.data_execucao,
        responsavel_id=falha.responsavel_id,
        responsavel_identificador=falha.responsavel_identificador,
        backup_id=falha.backup_id,
    )
