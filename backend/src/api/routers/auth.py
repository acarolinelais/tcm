from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import get_auth_service, get_session, get_usuario_atual
from src.application.schemas.auth import (
    LoginRequest,
    PerfilAtualResponse,
    RefreshRequest,
    TokenResponse,
)
from src.application.services.auth_service import AuthServiceImpl
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.infrastructure.data.models.time_membro_model import TimeMembroModel
from src.infrastructure.data.models.time_model import TimeModel
from src.infrastructure.data.models.unidade_model import UnidadeModel

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest, service: AuthServiceImpl = Depends(get_auth_service)
) -> TokenResponse:
    return await service.login(request)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    request: RefreshRequest, service: AuthServiceImpl = Depends(get_auth_service)
) -> TokenResponse:
    return await service.renovar(request)


@router.post("/logout", status_code=204)
async def logout(
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
    service: AuthServiceImpl = Depends(get_auth_service),
):
    if usuario_atual.sessao_id is not None:
        await service.logout(usuario_atual.sessao_id)


@router.get("/me", response_model=PerfilAtualResponse)
async def perfil_atual(
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
    session: AsyncSession = Depends(get_session),
) -> PerfilAtualResponse:
    rows = (
        await session.execute(
            select(TimeModel.id, TimeModel.nome, TimeMembroModel.papel)
            .join(TimeMembroModel, TimeMembroModel.time_id == TimeModel.id)
            .where(
                TimeMembroModel.usuario_id == usuario_atual.id,
                TimeMembroModel.unidade_id == usuario_atual.unidade_id,
                TimeMembroModel.ativo.is_(True),
                TimeModel.ativo.is_(True),
            )
            .order_by(TimeModel.nome)
        )
    ).all()
    times = [{"id": str(row.id), "nome": row.nome, "papel": row.papel} for row in rows]
    gerenciados = (
        await session.execute(
            select(TimeModel.id, TimeModel.nome)
            .where(
                TimeModel.gerente_id == usuario_atual.id,
                TimeModel.unidade_id == usuario_atual.unidade_id,
                TimeModel.ativo.is_(True),
            )
            .order_by(TimeModel.nome)
        )
    ).all()
    unidade_nome = await session.scalar(
        select(UnidadeModel.nome).where(UnidadeModel.id == usuario_atual.unidade_id)
    )
    existentes = {time["id"] for time in times}
    times.extend(
        {"id": str(row.id), "nome": row.nome, "papel": "gerente"}
        for row in gerenciados
        if str(row.id) not in existentes
    )
    return PerfilAtualResponse(
        id=usuario_atual.id,
        nome=usuario_atual.nome,
        email=usuario_atual.email,
        unidade_id=usuario_atual.unidade_id,
        unidade_nome=unidade_nome or "",
        perfil_codigo=usuario_atual.perfil_codigo,
        perfil=usuario_atual.perfil or None,
        permissoes=sorted(usuario_atual.permissoes),
        times=times,
        time_atual_id=usuario_atual.time_atual_id,
        tem_multiplos_times=len(times) > 1,
    )
