from uuid import UUID

from fastapi import APIRouter, Depends

from src.api.dependencies import get_caso_teste_service, get_usuario_atual
from src.application.schemas.caso_teste import AtualizarCasoTesteRequest, CasoTesteResponse
from src.application.services.interfaces.caso_teste_service import CasoTesteService
from src.domain.common.usuario_autenticado import UsuarioAutenticado

router = APIRouter(prefix="/api/test-cases", tags=["test-cases"])


@router.get("/{caso_id}", response_model=CasoTesteResponse)
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
