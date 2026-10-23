from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response

from src.api.dependencies import get_time_service, get_usuario_atual
from src.application.schemas.time import (
    AdicionarMembroRequest,
    CriarTimeRequest,
    TimeMembroResponse,
    TimeResponse,
)
from src.application.schemas.usuario import UsuarioResponse
from src.application.services.interfaces.time_service import TimeService
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado

router = APIRouter(prefix="/api/times", tags=["times"])


@router.get("/usuarios-disponiveis", response_model=list[UsuarioResponse])
async def listar_usuarios_disponiveis(
    service: TimeService = Depends(get_time_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
) -> list[UsuarioResponse]:
    return await service.listar_usuarios_disponiveis(usuario_atual)


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
    ativo: bool | None = None,
    busca: str | None = Query(None, max_length=120),
    service: TimeService = Depends(get_time_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    return await service.listar(usuario_atual, page, page_size, setor_id, ativo, busca)


@router.patch("/{id}/inativar", response_model=TimeResponse)
async def inativar(
    id: UUID,
    service: TimeService = Depends(get_time_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
) -> TimeResponse:
    return await service.definir_ativo(usuario_atual, id, False)


@router.patch("/{id}/ativar", response_model=TimeResponse)
async def ativar(
    id: UUID,
    service: TimeService = Depends(get_time_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
) -> TimeResponse:
    return await service.definir_ativo(usuario_atual, id, True)


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


@router.get("/{id}/membros", response_model=list[TimeMembroResponse])
async def listar_membros(
    id: UUID,
    service: TimeService = Depends(get_time_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
) -> list[TimeMembroResponse]:
    return await service.listar_membros(usuario_atual, id)


@router.delete("/{id}/membros/{usuario_id}", status_code=204)
async def remover_membro(
    id: UUID,
    usuario_id: UUID,
    service: TimeService = Depends(get_time_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
) -> Response:
    await service.remover_membro(usuario_atual, id, usuario_id)
    return Response(status_code=204)
