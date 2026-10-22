from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response

from src.api.dependencies import get_usuario_service
from src.application.schemas.usuario import (
    AtualizarUsuarioRequest,
    CriarUsuarioRequest,
    UsuarioResponse,
)
from src.application.services.interfaces.usuario_service import UsuarioService
from src.domain.common.paged_result import PagedResult

router = APIRouter(prefix="/api/usuarios", tags=["usuarios"])


@router.get("", response_model=PagedResult[UsuarioResponse])
async def listar(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    service: UsuarioService = Depends(get_usuario_service),
):
    return await service.listar(page, page_size)


@router.get("/{id}", response_model=UsuarioResponse)
async def obter(id: UUID, service: UsuarioService = Depends(get_usuario_service)):
    return await service.obter(id)


@router.post("", response_model=UsuarioResponse, status_code=201)
async def criar(
    request: CriarUsuarioRequest,
    response: Response,
    service: UsuarioService = Depends(get_usuario_service),
):
    usuario = await service.criar(request)
    response.headers["Location"] = f"/api/usuarios/{usuario.id}"
    return usuario


@router.put("/{id}", response_model=UsuarioResponse)
async def atualizar(
    id: UUID,
    request: AtualizarUsuarioRequest,
    service: UsuarioService = Depends(get_usuario_service),
):
    return await service.atualizar(id, request)


@router.patch("/{id}/ativar", status_code=204)
async def ativar(id: UUID, service: UsuarioService = Depends(get_usuario_service)):
    await service.ativar(id)


@router.patch("/{id}/inativar", status_code=204)
async def inativar(id: UUID, service: UsuarioService = Depends(get_usuario_service)):
    await service.inativar(id)
