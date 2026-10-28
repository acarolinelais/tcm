from uuid import UUID

from fastapi import APIRouter, Depends, Response

from src.api.dependencies import get_caso_teste_service, get_usuario_atual
from src.application.schemas.caso_teste import (
    AtualizarCasoTesteRequest,
    CasoTesteDetalheResponse,
    CasoTesteResponse,
)
from src.application.schemas.link_pull_request import (
    AdicionarLinkPullRequestRequest,
    LinkPullRequestResponse,
    LinksPullRequestResponse,
)
from src.application.services.interfaces.caso_teste_service import CasoTesteService
from src.domain.common.usuario_autenticado import UsuarioAutenticado

router = APIRouter(prefix="/api/test-cases", tags=["test-cases"])


@router.get("/{caso_id}", response_model=CasoTesteDetalheResponse)
async def obter(
    caso_id: UUID,
    service: CasoTesteService = Depends(get_caso_teste_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    return await service.obter(usuario_atual, caso_id)


@router.put("/{caso_id}", response_model=CasoTesteResponse)
async def atualizar(
    caso_id: UUID,
    request: AtualizarCasoTesteRequest,
    service: CasoTesteService = Depends(get_caso_teste_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    return await service.atualizar(usuario_atual, caso_id, request)


@router.patch("/{caso_id}/transferir-para-backup", response_model=CasoTesteResponse)
async def transferir_para_backup(
    caso_id: UUID,
    service: CasoTesteService = Depends(get_caso_teste_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    return await service.transferir_para_backup(usuario_atual, caso_id)


@router.get("/{caso_id}/pull-requests", response_model=LinksPullRequestResponse)
async def listar_pull_requests(
    caso_id: UUID,
    service: CasoTesteService = Depends(get_caso_teste_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    return await service.listar_pull_requests(usuario_atual, caso_id)


@router.post("/{caso_id}/pull-requests", response_model=LinkPullRequestResponse, status_code=201)
async def adicionar_pull_request(
    caso_id: UUID,
    request: AdicionarLinkPullRequestRequest,
    service: CasoTesteService = Depends(get_caso_teste_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    return await service.adicionar_pull_request(usuario_atual, caso_id, request)


@router.patch("/{caso_id}/pull-requests/{link_id}/inativar", status_code=204)
async def remover_pull_request(
    caso_id: UUID,
    link_id: UUID,
    service: CasoTesteService = Depends(get_caso_teste_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
) -> Response:
    await service.remover_pull_request(usuario_atual, caso_id, link_id)
    return Response(status_code=204)
