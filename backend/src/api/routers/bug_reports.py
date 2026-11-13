from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from src.api.dependencies import get_bug_report_service, get_usuario_atual
from src.application.schemas.bug_report import CasoComFalhasResponse, CorrecaoConcluidaResponse
from src.application.schemas.caso_teste import StatusDaCorrecao
from src.application.services.interfaces.bug_report_service import BugReportService
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.correcao import ResultadoCorrecao
from src.domain.queries.bug_report import FiltrosBugReport
from src.domain.queries.correcao_concluida import FiltrosCorrecoesConcluidas

router = APIRouter(prefix="/api/bug-reports", tags=["bug-reports"])


@router.get("", response_model=PagedResult[CasoComFalhasResponse])
async def listar_bug_reports(
    projeto_id: UUID = Query(...),
    modelo_dispositivo_id: UUID | None = Query(None),
    responsavel: Annotated[str | None, Query(max_length=100)] = None,
    dev_fix: Annotated[str | None, Query(max_length=100)] = None,
    reincidentes: bool = Query(False),
    dia: str | None = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    semana: str | None = Query(None, pattern=r"^\d{4}-W\d{2}$"),
    fuso_horario: str = Query("UTC", min_length=1, max_length=64),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    service: BugReportService = Depends(get_bug_report_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    filtros = FiltrosBugReport(
        projeto_id=projeto_id,
        modelo_dispositivo_id=modelo_dispositivo_id,
        responsavel=responsavel,
        dev_fix=dev_fix,
        reincidentes=reincidentes,
    )
    return await service.listar(usuario_atual, filtros, page, page_size, dia, semana, fuso_horario)


# Spec 073: a aba My Fixes do projeto. Só os Status da correção entram no filtro.
@router.get("/my-fixes", response_model=PagedResult[CasoComFalhasResponse])
async def listar_my_fixes(
    projeto_id: UUID = Query(...),
    status: Annotated[list[StatusDaCorrecao] | None, Query()] = None,
    responsavel: Annotated[str | None, Query(max_length=100)] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    service: BugReportService = Depends(get_bug_report_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    filtros = FiltrosBugReport(
        projeto_id=projeto_id, responsavel=responsavel, status=tuple(status or ())
    )
    return await service.listar_my_fixes(usuario_atual, filtros, page, page_size)


# Spec 076: a visão Concluídas da My Fixes, uma linha por tentativa de correção fechada.
@router.get("/my-fixes/concluidas", response_model=PagedResult[CorrecaoConcluidaResponse])
async def listar_correcoes_concluidas(
    projeto_id: UUID = Query(...),
    corretor_id: UUID | None = Query(None),
    resultado: ResultadoCorrecao | None = Query(None),
    dia: str | None = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    semana: str | None = Query(None, pattern=r"^\d{4}-W\d{2}$"),
    fuso_horario: str = Query("UTC", min_length=1, max_length=64),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    service: BugReportService = Depends(get_bug_report_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    filtros = FiltrosCorrecoesConcluidas(
        projeto_id=projeto_id,
        corretor_id=corretor_id,
        resultado=resultado.value if resultado else None,
    )
    return await service.listar_concluidas(
        usuario_atual, filtros, page, page_size, dia, semana, fuso_horario
    )
