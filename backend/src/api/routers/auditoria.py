from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from src.api.dependencies import get_auditoria_service, get_usuario_atual
from src.application.schemas.auditoria import RegistroAuditoriaResponse
from src.application.services.interfaces.auditoria_service import AuditoriaService
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.queries.auditoria import AcaoAuditoria, OrigemAuditoria

router = APIRouter(prefix="/api/auditoria", tags=["auditoria"])

_DIA = r"^\d{4}-\d{2}-\d{2}$"


@router.get("", response_model=PagedResult[RegistroAuditoriaResponse])
async def listar(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    data_inicio: str | None = Query(None, pattern=_DIA),
    data_fim: str | None = Query(None, pattern=_DIA),
    fuso_horario: str = Query("UTC", min_length=1, max_length=64),
    usuario_id: Annotated[list[UUID] | None, Query()] = None,
    perfil: Annotated[str | None, Query(max_length=100)] = None,
    acao: AcaoAuditoria | None = None,
    tc_id: Annotated[str | None, Query(max_length=100)] = None,
    projeto_id: UUID | None = None,
    origem: OrigemAuditoria | None = None,
    tela: Annotated[str | None, Query(max_length=500)] = None,
    service: AuditoriaService = Depends(get_auditoria_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    return await service.listar(
        usuario_atual,
        page,
        page_size,
        data_inicio=data_inicio,
        data_fim=data_fim,
        fuso_horario=fuso_horario,
        usuario_ids=usuario_id or (),
        perfil=perfil,
        acao=acao,
        tc_id=tc_id,
        projeto_id=projeto_id,
        origem=origem,
        tela=tela,
    )
