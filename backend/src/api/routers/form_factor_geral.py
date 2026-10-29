from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from src.api.dependencies import get_form_factor_service, get_usuario_atual
from src.application.schemas.form_factor_historico import (
    HistoricoProjetoResponse,
    ResumoExecucoesResponse,
)
from src.application.services.interfaces.form_factor_service import FormFactorService
from src.domain.common.usuario_autenticado import UsuarioAutenticado

router = APIRouter(prefix="/api/form-factor/general", tags=["form-factor"])


@router.get("/projetos/{projeto_id}/historico", response_model=HistoricoProjetoResponse)
async def historico_projeto(
    projeto_id: UUID,
    busca: Annotated[str | None, Query(max_length=100)] = None,
    tc_id: Annotated[str | None, Query(max_length=100)] = None,
    modelo_dispositivo_id: UUID | None = Query(None),
    dia: str | None = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    semana: str | None = Query(None, pattern=r"^\d{4}-W\d{2}$"),
    fuso_horario: str = Query("UTC", min_length=1, max_length=64),
    service: FormFactorService = Depends(get_form_factor_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    return await service.historico_projeto(
        usuario_atual, projeto_id, busca, tc_id, modelo_dispositivo_id, dia, semana, fuso_horario
    )


@router.get("/casos/{caso_teste_id}/execucoes", response_model=ResumoExecucoesResponse)
async def resumo_execucoes(
    caso_teste_id: UUID,
    fuso_horario: str = Query("UTC", min_length=1, max_length=64),
    service: FormFactorService = Depends(get_form_factor_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    return await service.resumo_execucoes(usuario_atual, caso_teste_id, fuso_horario)
