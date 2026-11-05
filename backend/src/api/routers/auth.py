from fastapi import APIRouter, Cookie, Depends, Response
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import (
    bearer,
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
    SessaoEmitida,
    TokenResponse,
)
from src.application.services.interfaces.auth_service import AuthService
from src.domain.common.cor_avatar import CorAvatar
from src.domain.common.exceptions import CredenciaisInvalidasException, ForbiddenException
from src.domain.common.idioma_preferido import IdiomaPreferido
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.infrastructure.data.models.setor_gerente_model import SetorGerenteModel
from src.infrastructure.data.models.setor_model import SetorModel
from src.infrastructure.data.models.time_membro_model import TimeMembroModel
from src.infrastructure.data.models.time_model import TimeModel
from src.infrastructure.data.models.unidade_model import UnidadeModel
from src.infrastructure.data.models.usuario_model import UsuarioModel
from src.infrastructure.security.jwt import REFRESH_TOKEN_HOURS, decodificar_token

router = APIRouter(prefix="/api/auth", tags=["auth"])

COOKIE_REFRESH = "sdf_refresh"
_COOKIE = {"path": "/api/auth", "secure": True, "httponly": True, "samesite": "strict"}


def _responder(response: Response, sessao: SessaoEmitida) -> TokenResponse:
    response.set_cookie(
        COOKIE_REFRESH, sessao.refresh_token, max_age=REFRESH_TOKEN_HOURS * 3600, **_COOKIE
    )
    return TokenResponse(access_token=sessao.access_token, expires_in=sessao.expires_in)


@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest, response: Response, service: AuthService = Depends(get_auth_service)
) -> TokenResponse:
    return _responder(response, await service.login(request))


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    response: Response,
    refresh_token: str | None = Cookie(default=None, alias=COOKIE_REFRESH),
    service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    if not refresh_token:
        raise CredenciaisInvalidasException("Credenciais inválidas.")
    return _responder(response, await service.renovar(refresh_token))


@router.post("/logout", status_code=204)
async def logout(
    response: Response,
    refresh_token: str | None = Cookie(default=None, alias=COOKIE_REFRESH),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    service: AuthService = Depends(get_auth_service),
):
    payload = decodificar_token(credentials.credentials) if credentials else None
    sessao_id = payload.sessao_id if payload else None
    if refresh_token or sessao_id:
        await service.logout(refresh_token, sessao_id)
    response.delete_cookie(COOKIE_REFRESH, **_COOKIE)


@router.post("/trocar-senha", response_model=TokenResponse)
async def trocar_senha(
    request: AlterarSenhaRequest,
    response: Response,
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual_para_troca_senha),
    service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    if not usuario_atual.senha_alteracao_obrigatoria or usuario_atual.sessao_id is None:
        raise ForbiddenException("A troca inicial de senha não é necessária.")
    sessao = await service.alterar_senha_inicial(usuario_atual.id, usuario_atual.sessao_id, request)
    return _responder(response, sessao)


@router.patch("/preferencias", response_model=PreferenciasResponse)
async def atualizar_preferencias(
    request: AtualizarPreferenciasRequest,
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual_para_troca_senha),
    service: AuthService = Depends(get_auth_service),
) -> PreferenciasResponse:
    return await service.atualizar_preferencias(usuario_atual.unidade_id, usuario_atual.id, request)


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
    preferencias = (
        await session.execute(
            select(UsuarioModel.idioma_preferido, UsuarioModel.cor_avatar).where(
                UsuarioModel.id == usuario_atual.id,
                UsuarioModel.unidade_id == usuario_atual.unidade_id,
            )
        )
    ).one_or_none()
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
        idioma_preferido=preferencias.idioma_preferido if preferencias else IdiomaPreferido.INGLES,
        cor_avatar=preferencias.cor_avatar if preferencias else CorAvatar.AZUL,
    )
