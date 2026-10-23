from fastapi import APIRouter, Depends, Query, Response

from src.api.dependencies import get_setor_service, get_usuario_atual
from src.application.schemas.setor import CriarSetorRequest, SetorResponse
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
    service: SetorService = Depends(get_setor_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    return await service.listar(usuario_atual, page, page_size)
