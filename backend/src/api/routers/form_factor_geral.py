from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from src.api.dependencies import get_form_factor_service, get_usuario_atual
from src.application.schemas.form_factor import (
    FormFactorGlobalResponse,
    FormFactorResultadosGlobaisResponse,
)
from src.application.services.interfaces.form_factor_service import FormFactorService
from src.domain.common.usuario_autenticado import UsuarioAutenticado

router = APIRouter(prefix="/api/form-factor/general", tags=["form-factor"])


@router.get("", response_model=FormFactorGlobalResponse)
async def listar_form_factor_global(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    semana: str | None = Query(None, pattern=r"^\d{4}-W\d{2}$"),
    projeto_id: UUID | None = Query(None),
    responsavel_id: UUID | None = Query(None),
    tc_id: Annotated[str | None, Query(max_length=100)] = None,
    sdf_id: Annotated[str | None, Query(max_length=100)] = None,
    modelo_dispositivo_id: UUID | None = Query(None),
    resultado: Literal["PASS", "FAIL"] | None = Query(None),
    service: FormFactorService = Depends(get_form_factor_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    return await service.listar_global(
        usuario_atual,
        page,
        page_size,
        semana,
        projeto_id,
        responsavel_id,
        tc_id,
        sdf_id,
        modelo_dispositivo_id,
        resultado,
    )


@router.get("/results", response_model=FormFactorResultadosGlobaisResponse)
async def listar_resultados_form_factor_global(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    semana: str | None = Query(None, pattern=r"^\d{4}-W\d{2}$"),
    projeto_id: UUID | None = Query(None),
    responsavel_id: UUID | None = Query(None),
    tc_id: Annotated[str | None, Query(max_length=100)] = None,
    sdf_id: Annotated[str | None, Query(max_length=100)] = None,
    modelo_dispositivo_id: UUID | None = Query(None),
    resultado: Literal["PASS", "FAIL"] | None = Query(None),
    origem: Literal["SDF", "MANUAL"] | None = Query(None),
    service: FormFactorService = Depends(get_form_factor_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    return await service.listar_resultados_global(
        usuario_atual,
        page,
        page_size,
        semana,
        projeto_id,
        responsavel_id,
        tc_id,
        sdf_id,
        modelo_dispositivo_id,
        resultado,
        origem,
    )
