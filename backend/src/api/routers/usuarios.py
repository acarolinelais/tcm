from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response

from src.api.dependencies import get_usuario_atual, get_usuario_service
from src.application.schemas.usuario import (
    AtualizarUsuarioRequest,
    CriarUsuarioRequest,
    UsuarioResponse,
)
from src.application.services.interfaces.usuario_service import UsuarioService
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado

router = APIRouter(prefix="/api/usuarios", tags=["usuarios"])


@router.get("", response_model=PagedResult[UsuarioResponse])
async def listar(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    nome: str | None = Query(None, min_length=1, max_length=150),
    email: str | None = Query(None, min_length=1, max_length=254),
    ativo: bool | None = Query(None),
    perfil_id: UUID | None = Query(None),
    service: UsuarioService = Depends(get_usuario_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    return await service.listar(usuario_atual, page, page_size, nome, email, ativo, perfil_id)


@router.get("/{id}", response_model=UsuarioResponse)
async def obter(
    id: UUID,
    service: UsuarioService = Depends(get_usuario_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    return await service.obter(usuario_atual, id)


@router.post("", response_model=UsuarioResponse, status_code=201)
async def criar(
    request: CriarUsuarioRequest,
    response: Response,
    service: UsuarioService = Depends(get_usuario_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    usuario = await service.criar(usuario_atual, request)
    response.headers["Location"] = f"/api/usuarios/{usuario.id}"
    return usuario


@router.put("/{id}", response_model=UsuarioResponse)
async def atualizar(
    id: UUID,
    request: AtualizarUsuarioRequest,
    service: UsuarioService = Depends(get_usuario_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    return await service.atualizar(usuario_atual, id, request)


@router.patch("/{id}/ativar", status_code=204)
async def ativar(
    id: UUID,
    service: UsuarioService = Depends(get_usuario_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    await service.ativar(usuario_atual, id)


@router.patch("/{id}/inativar", status_code=204)
async def inativar(
    id: UUID,
    service: UsuarioService = Depends(get_usuario_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    await service.inativar(usuario_atual, id)
