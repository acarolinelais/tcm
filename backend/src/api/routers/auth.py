from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import (
    get_auth_service,
    get_session,
    get_usuario_atual_para_troca_senha,
)
from src.application.schemas.auth import (
    AlterarSenhaRequest,
    AtualizarPreferenciasRequest,
    LoginRequest,
    PerfilAtualResponse,
    PreferenciasResponse,
    RefreshRequest,
    TokenResponse,
)
from src.application.services.interfaces.auth_service import AuthService
from src.domain.common.exceptions import ForbiddenException
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.infrastructure.data.models.setor_gerente_model import SetorGerenteModel
from src.infrastructure.data.models.setor_model import SetorModel
from src.infrastructure.data.models.time_membro_model import TimeMembroModel
from src.infrastructure.data.models.time_model import TimeModel
from src.infrastructure.data.models.unidade_model import UnidadeModel
from src.infrastructure.data.models.usuario_model import UsuarioModel

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest, service: AuthService = Depends(get_auth_service)
) -> TokenResponse:
    return await service.login(request)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    request: RefreshRequest, service: AuthService = Depends(get_auth_service)
) -> TokenResponse:
    return await service.renovar(request)


@router.post("/logout", status_code=204)
async def logout(
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual_para_troca_senha),
    service: AuthService = Depends(get_auth_service),
):
    if usuario_atual.sessao_id is not None:
        await service.logout(usuario_atual.sessao_id)


@router.post("/trocar-senha", response_model=TokenResponse)
async def trocar_senha(
    request: AlterarSenhaRequest,
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual_para_troca_senha),
    service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    if not usuario_atual.senha_alteracao_obrigatoria or usuario_atual.sessao_id is None:
        raise ForbiddenException("A troca inicial de senha não é necessária.")
    return await service.alterar_senha_inicial(usuario_atual.id, usuario_atual.sessao_id, request)


@router.patch("/preferencias", response_model=PreferenciasResponse)
async def atualizar_preferencias(
    request: AtualizarPreferenciasRequest,
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual_para_troca_senha),
    service: AuthService = Depends(get_auth_service),
) -> PreferenciasResponse:
    await service.atualizar_preferencias(usuario_atual.unidade_id, usuario_atual.id, request)
    return PreferenciasResponse(idioma_preferido=request.idioma_preferido)


@router.get("/me", response_model=PerfilAtualResponse)
async def perfil_atual(
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual_para_troca_senha),
    session: AsyncSession = Depends(get_session),
) -> PerfilAtualResponse:
    rows = (
        await session.execute(
            select(TimeModel.id, TimeModel.nome)
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
    times = [{"id": str(row.id), "nome": row.nome} for row in rows]
    gerenciados = (
        (
            await session.execute(
                select(TimeModel.id, TimeModel.nome)
                .join(SetorModel, SetorModel.id == TimeModel.setor_id)
                .join(SetorGerenteModel, SetorGerenteModel.setor_id == SetorModel.id)
                .where(
                    SetorGerenteModel.usuario_id == usuario_atual.id,
                    SetorGerenteModel.unidade_id == usuario_atual.unidade_id,
                    SetorGerenteModel.ativo.is_(True),
                    SetorModel.ativo.is_(True),
                    TimeModel.unidade_id == usuario_atual.unidade_id,
                    TimeModel.ativo.is_(True),
                )
                .order_by(TimeModel.nome)
            )
        ).all()
        if usuario_atual.perfil_codigo == "GERENTE"
        else []
    )
    unidade_nome = await session.scalar(
        select(UnidadeModel.nome).where(UnidadeModel.id == usuario_atual.unidade_id)
    )
    idioma_preferido = await session.scalar(
        select(UsuarioModel.idioma_preferido).where(
            UsuarioModel.id == usuario_atual.id,
            UsuarioModel.unidade_id == usuario_atual.unidade_id,
        )
    )
    existentes = {time["id"] for time in times}
    times.extend(
        {"id": str(row.id), "nome": row.nome}
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
        setores_gerenciados=list(usuario_atual.setores_gerenciados),
        time_atual_id=usuario_atual.time_atual_id,
        tem_multiplos_times=len(times) > 1,
        senha_alteracao_obrigatoria=usuario_atual.senha_alteracao_obrigatoria,
        idioma_preferido=idioma_preferido or "en",
    )
