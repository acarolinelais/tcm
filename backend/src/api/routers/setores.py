from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response

from src.api.dependencies import get_setor_service, get_usuario_atual
from src.application.schemas.setor import (
    AtualizarSetorRequest,
    CriarSetorRequest,
    SetorGerenteRequest,
    SetorGerenteResponse,
    SetorResponse,
)
from src.application.services.interfaces.setor_service import SetorService
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado

router = APIRouter(prefix="/api/setores", tags=["setores"])


@router.post("", response_model=SetorResponse, status_code=201)
async def criar(
    request: CriarSetorRequest,
    response: Response,
    service: SetorService = Depends(get_setor_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
) -> SetorResponse:
    setor = await service.criar(usuario_atual, request)
    response.headers["Location"] = f"/api/setores/{setor.id}"
    return setor


@router.get("", response_model=PagedResult[SetorResponse])
async def listar(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    ativo: bool | None = None,
    busca: str | None = Query(None, max_length=150),
    service: SetorService = Depends(get_setor_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    return await service.listar(usuario_atual, page, page_size, ativo, busca)


@router.patch("/{setor_id}", response_model=SetorResponse)
async def atualizar(
    setor_id: UUID,
    request: AtualizarSetorRequest,
    service: SetorService = Depends(get_setor_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
) -> SetorResponse:
    return await service.atualizar(usuario_atual, setor_id, request)


@router.get("/{setor_id}/gerentes", response_model=list[SetorGerenteResponse])
async def listar_gerentes(
    setor_id: UUID,
    service: SetorService = Depends(get_setor_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
) -> list[SetorGerenteResponse]:
    return await service.listar_gerentes(usuario_atual, setor_id)


@router.post("/{setor_id}/gerentes", response_model=SetorGerenteResponse, status_code=201)
async def associar_gerente(
    setor_id: UUID,
    request: SetorGerenteRequest,
    service: SetorService = Depends(get_setor_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
) -> SetorGerenteResponse:
    return await service.associar_gerente(usuario_atual, setor_id, request.usuario_id)


@router.delete("/{setor_id}/gerentes/{gerente_id}", status_code=204)
async def desassociar_gerente(
    setor_id: UUID,
    gerente_id: UUID,
    service: SetorService = Depends(get_setor_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
) -> Response:
    await service.desassociar_gerente(usuario_atual, setor_id, gerente_id)
    return Response(status_code=204)
