import os
from datetime import UTC, datetime

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.services.auth_service import AuthServiceImpl
from src.application.services.setor_service import SetorServiceImpl
from src.application.services.time_service import TimeServiceImpl
from src.application.services.usuario_service import UsuarioServiceImpl
from src.domain.common.exceptions import CredenciaisInvalidasException, ForbiddenException
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.infrastructure.data.models.auth_sessao_model import AuthSessaoModel
from src.infrastructure.data.models.perfil_model import PerfilModel
from src.infrastructure.data.models.permissao_model import PerfilPermissaoModel, PermissaoModel
from src.infrastructure.data.models.time_membro_model import TimeMembroModel
from src.infrastructure.data.models.time_model import TimeModel
from src.infrastructure.data.models.usuario_model import UsuarioModel
from src.infrastructure.data.session import get_session as get_session
from src.infrastructure.data.unit_of_work import UnitOfWorkImpl
from src.infrastructure.repositories.setor_repository import SetorRepositoryImpl
from src.infrastructure.repositories.time_membro_repository import TimeMembroRepositoryImpl
from src.infrastructure.repositories.time_repository import TimeRepositoryImpl
from src.infrastructure.repositories.usuario_repository import UsuarioRepositoryImpl
from src.infrastructure.security.autenticador_local import AutenticadorLocal
from src.infrastructure.security.jwt import criar_token, decodificar_token
from src.infrastructure.security.senha_hasher import hash_senha

bearer = HTTPBearer(auto_error=False)


async def get_usuario_atual(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    session: AsyncSession = Depends(get_session),
) -> UsuarioAutenticado:
    return await _obter_usuario_atual(credentials, session, permitir_senha_inicial=False)


async def get_usuario_atual_para_troca_senha(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    session: AsyncSession = Depends(get_session),
) -> UsuarioAutenticado:
    return await _obter_usuario_atual(credentials, session, permitir_senha_inicial=True)


async def _obter_usuario_atual(
    credentials: HTTPAuthorizationCredentials | None,
    session: AsyncSession,
    *,
    permitir_senha_inicial: bool,
) -> UsuarioAutenticado:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise CredenciaisInvalidasException("Credenciais inválidas.")
    payload = decodificar_token(credentials.credentials)
    if payload is None:
        raise CredenciaisInvalidasException("Credenciais inválidas.")
    sessao = await session.get(AuthSessaoModel, payload.sessao_id)
    usuario = await session.get(UsuarioModel, payload.usuario_id)
    agora = datetime.now(UTC).replace(tzinfo=None)
    if (
        sessao is None
        or sessao.revoked_at is not None
        or sessao.expires_at <= agora
        or usuario is None
        or not usuario.ativo
        or usuario.unidade_id != payload.unidade_id
        or usuario.auth_version != payload.auth_version
        or sessao.auth_version != usuario.auth_version
        or sessao.usuario_id != usuario.id
    ):
        raise CredenciaisInvalidasException("Credenciais inválidas.")
    perfil_nome = ""
    perfil = None
    permissoes: frozenset[str] = frozenset()
    if usuario.perfil_id:
        perfil = await session.get(PerfilModel, usuario.perfil_id)
        perfil_nome = perfil.nome if perfil else ""
        stmt = (
            select(PermissaoModel.id)
            .join(PerfilPermissaoModel, PerfilPermissaoModel.permissao_id == PermissaoModel.id)
            .where(PerfilPermissaoModel.perfil_id == usuario.perfil_id)
        )
        permissoes = frozenset((await session.execute(stmt)).scalars().all())
    perfil_codigo = perfil.codigo if perfil else None
    if perfil_codigo == "ADMIN_UNIDADE":
        permissoes = frozenset((await session.execute(select(PermissaoModel.id))).scalars().all())
        if not perfil_nome:
            perfil_nome = "Administrador da unidade"
    memberships = (
        (
            await session.execute(
                select(TimeMembroModel.time_id).where(
                    TimeMembroModel.usuario_id == usuario.id,
                    TimeMembroModel.unidade_id == usuario.unidade_id,
                    TimeMembroModel.ativo.is_(True),
                )
            )
        )
        .scalars()
        .all()
    )
    managed = (
        (
            await session.execute(
                select(TimeModel.id).where(
                    TimeModel.gerente_id == usuario.id,
                    TimeModel.unidade_id == usuario.unidade_id,
                    TimeModel.ativo.is_(True),
                )
            )
        )
        .scalars()
        .all()
    )
    if managed:
        permissoes = frozenset({*permissoes, "times.criar", "times.gerenciar"})
    identidade = UsuarioAutenticado(
        usuario.id,
        usuario.unidade_id,
        perfil_codigo,
        usuario.nome,
        usuario.email,
        perfil_nome,
        permissoes,
        tuple(memberships),
        tuple(managed),
        payload.time_id,
        payload.sessao_id,
        usuario.senha_alteracao_obrigatoria,
    )
    if identidade.senha_alteracao_obrigatoria and not permitir_senha_inicial:
        raise ForbiddenException("Altere sua senha inicial para continuar.")
    return identidade


async def get_usuario_service(session: AsyncSession = Depends(get_session)) -> UsuarioServiceImpl:
    repo = UsuarioRepositoryImpl(session)
    uow = UnitOfWorkImpl(session)
    return UsuarioServiceImpl(
        repo,
        uow,
        os.environ.get("SENHA_INICIAL_USUARIOS"),
        hash_senha,
    )


def exigir_permissao(usuario: UsuarioAutenticado, permissao: str) -> None:
    from src.domain.common.exceptions import ForbiddenException

    if not usuario.pode(permissao):
        raise ForbiddenException("Você não tem permissão para realizar esta operação.")


async def get_auth_service(session: AsyncSession = Depends(get_session)) -> AuthServiceImpl:
    repo = UsuarioRepositoryImpl(session)
    return AuthServiceImpl(AutenticadorLocal(repo), repo, criar_token, session)


async def get_setor_service(session: AsyncSession = Depends(get_session)) -> SetorServiceImpl:
    return SetorServiceImpl(SetorRepositoryImpl(session), UnitOfWorkImpl(session))


async def get_time_service(session: AsyncSession = Depends(get_session)) -> TimeServiceImpl:
    return TimeServiceImpl(
        TimeRepositoryImpl(session),
        SetorRepositoryImpl(session),
        TimeMembroRepositoryImpl(session),
        UsuarioRepositoryImpl(session),
        UnitOfWorkImpl(session),
    )
