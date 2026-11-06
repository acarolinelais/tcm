from uuid import UUID

from fastapi import APIRouter, Depends, Query

from src.api.dependencies import get_overview_service, get_usuario_atual
from src.application.schemas.overview import (
    OverviewPessoalResponse,
    OverviewProjetoResponse,
    OverviewResponse,
    OverviewTimeResponse,
)
from src.application.services.interfaces.overview_service import OverviewService
from src.domain.common.usuario_autenticado import UsuarioAutenticado

router = APIRouter(prefix="/api/overview", tags=["overview"])


@router.get("", response_model=OverviewResponse)
async def obter(
    fuso_horario: str = Query("UTC", min_length=1, max_length=64),
    service: OverviewService = Depends(get_overview_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    return await service.obter(usuario_atual, fuso_horario)


@router.get("/time", response_model=OverviewTimeResponse)
async def obter_time(
    fuso_horario: str = Query("UTC", min_length=1, max_length=64),
    service: OverviewService = Depends(get_overview_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    return await service.obter_time(usuario_atual, fuso_horario)


@router.get("/projetos/{projeto_id}", response_model=OverviewProjetoResponse)
async def obter_projeto(
    projeto_id: UUID,
    fuso_horario: str = Query("UTC", min_length=1, max_length=64),
    service: OverviewService = Depends(get_overview_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    return await service.obter_projeto(usuario_atual, projeto_id, fuso_horario)


@router.get("/pessoal", response_model=OverviewPessoalResponse)
async def obter_pessoal(
    fuso_horario: str = Query("UTC", min_length=1, max_length=64),
    service: OverviewService = Depends(get_overview_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    return await service.obter_pessoal(usuario_atual, fuso_horario)
