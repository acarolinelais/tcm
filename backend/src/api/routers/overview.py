from fastapi import APIRouter, Depends, Query

from src.api.dependencies import get_overview_service, get_usuario_atual
from src.application.schemas.overview import OverviewResponse
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
