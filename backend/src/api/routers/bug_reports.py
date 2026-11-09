from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from src.api.dependencies import get_bug_report_service, get_usuario_atual
from src.application.schemas.bug_report import FalhaAbertaResponse
from src.application.services.interfaces.bug_report_service import BugReportService
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.queries.bug_report import FiltrosBugReport

router = APIRouter(prefix="/api/bug-reports", tags=["bug-reports"])


@router.get("", response_model=PagedResult[FalhaAbertaResponse])
async def listar_bug_reports(
    projeto_id: UUID | None = Query(None),
    modelo_dispositivo_id: UUID | None = Query(None),
    responsavel: Annotated[str | None, Query(max_length=100)] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    service: BugReportService = Depends(get_bug_report_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    filtros = FiltrosBugReport(
        projeto_id=projeto_id, modelo_dispositivo_id=modelo_dispositivo_id, responsavel=responsavel
    )
    return await service.listar(usuario_atual, filtros, page, page_size)
