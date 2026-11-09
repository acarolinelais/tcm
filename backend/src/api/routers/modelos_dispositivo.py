from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response

from src.api.dependencies import get_modelo_dispositivo_service, get_usuario_atual
from src.application.schemas.modelo_dispositivo import (
    AtualizarModeloDispositivoRequest,
    CriarModeloDispositivoRequest,
    ModeloDispositivoOpcaoResponse,
    ModeloDispositivoResponse,
)
from src.application.services.interfaces.modelo_dispositivo_service import ModeloDispositivoService
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado

router = APIRouter(prefix="/api/modelos-dispositivo", tags=["modelos-dispositivo"])


@router.get("", response_model=PagedResult[ModeloDispositivoResponse])
async def listar(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    ativo: bool | None = None,
    busca: str | None = Query(None, max_length=120),
    service: ModeloDispositivoService = Depends(get_modelo_dispositivo_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    return await service.listar(usuario_atual, page, page_size, ativo, busca)


@router.get("/opcoes", response_model=PagedResult[ModeloDispositivoOpcaoResponse])
async def listar_opcoes(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    busca: str | None = Query(None, max_length=120),
    service: ModeloDispositivoService = Depends(get_modelo_dispositivo_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    return await service.listar_opcoes(usuario_atual, page, page_size, busca)


@router.post("", response_model=ModeloDispositivoResponse, status_code=201)
async def criar(
    request: CriarModeloDispositivoRequest,
    response: Response,
    service: ModeloDispositivoService = Depends(get_modelo_dispositivo_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    modelo = await service.criar(usuario_atual, request)
    response.headers["Location"] = f"/api/modelos-dispositivo/{modelo.id}"
    return modelo


@router.put("/{modelo_id}", response_model=ModeloDispositivoResponse)
@router.patch("/{modelo_id}", response_model=ModeloDispositivoResponse)
async def atualizar(
    modelo_id: UUID,
    request: AtualizarModeloDispositivoRequest,
    service: ModeloDispositivoService = Depends(get_modelo_dispositivo_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    return await service.atualizar(usuario_atual, modelo_id, request)


@router.patch("/{modelo_id}/ativar", response_model=ModeloDispositivoResponse)
async def ativar(
    modelo_id: UUID,
    service: ModeloDispositivoService = Depends(get_modelo_dispositivo_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    return await service.atualizar(
        usuario_atual, modelo_id, AtualizarModeloDispositivoRequest(ativo=True)
    )


@router.patch("/{modelo_id}/inativar", response_model=ModeloDispositivoResponse)
async def inativar(
    modelo_id: UUID,
    service: ModeloDispositivoService = Depends(get_modelo_dispositivo_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    return await service.atualizar(
        usuario_atual, modelo_id, AtualizarModeloDispositivoRequest(ativo=False)
    )
