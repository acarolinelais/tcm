from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response

from src.api.dependencies import get_time_service, get_usuario_atual
from src.application.schemas.time import (
    AdicionarMembroRequest,
    AtualizarPapelMembroRequest,
    CriarTimeRequest,
    TimeMembroResponse,
    TimeResponse,
)
from src.application.services.interfaces.time_service import TimeService
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado

router = APIRouter(prefix="/api/times", tags=["times"])


@router.post("", response_model=TimeResponse, status_code=201)
async def criar(
    request: CriarTimeRequest,
    response: Response,
    service: TimeService = Depends(get_time_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
) -> TimeResponse:
    time = await service.criar(usuario_atual, request)
    response.headers["Location"] = f"/api/times/{time.id}"
    return time


@router.get("", response_model=PagedResult[TimeResponse])
async def listar(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    setor_id: UUID | None = None,
    service: TimeService = Depends(get_time_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    return await service.listar(usuario_atual, page, page_size, setor_id)


@router.post("/{id}/membros", response_model=TimeMembroResponse, status_code=201)
async def adicionar_membro(
    id: UUID,
    request: AdicionarMembroRequest,
    response: Response,
    service: TimeService = Depends(get_time_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
) -> TimeMembroResponse:
    membro = await service.adicionar_membro(usuario_atual, id, request)
    response.headers["Location"] = f"/api/times/{id}/membros/{membro.usuario_id}"
    return membro


@router.patch("/{id}/membros/{usuario_id}", response_model=TimeMembroResponse)
async def atualizar_papel(
    id: UUID,
    usuario_id: UUID,
    request: AtualizarPapelMembroRequest,
    service: TimeService = Depends(get_time_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
) -> TimeMembroResponse:
    return await service.atualizar_papel(usuario_atual, id, usuario_id, request)
