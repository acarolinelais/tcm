from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.services.auth_service import AuthServiceImpl
from src.application.services.setor_service import SetorServiceImpl
from src.application.services.time_service import TimeServiceImpl
from src.application.services.usuario_service import UsuarioServiceImpl
from src.domain.common.exceptions import CredenciaisInvalidasException
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.infrastructure.data.session import get_session as get_session
from src.infrastructure.data.unit_of_work import UnitOfWorkImpl
from src.infrastructure.repositories.setor_repository import SetorRepositoryImpl
from src.infrastructure.repositories.time_membro_repository import TimeMembroRepositoryImpl
from src.infrastructure.repositories.time_repository import TimeRepositoryImpl
from src.infrastructure.repositories.usuario_repository import UsuarioRepositoryImpl
from src.infrastructure.security.autenticador_local import AutenticadorLocal
from src.infrastructure.security.jwt import criar_token, decodificar_token

bearer = HTTPBearer(auto_error=False)


async def get_usuario_atual(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> UsuarioAutenticado:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise CredenciaisInvalidasException("Credenciais inválidas.")
    payload = decodificar_token(credentials.credentials)
    if payload is None:
        raise CredenciaisInvalidasException("Credenciais inválidas.")
    return UsuarioAutenticado(payload.usuario_id, payload.unidade_id, payload.admin_unidade)


async def get_usuario_service(session: AsyncSession = Depends(get_session)) -> UsuarioServiceImpl:
    repo = UsuarioRepositoryImpl(session)
    uow = UnitOfWorkImpl(session)
    return UsuarioServiceImpl(repo, uow)


async def get_auth_service(session: AsyncSession = Depends(get_session)) -> AuthServiceImpl:
    repo = UsuarioRepositoryImpl(session)
    return AuthServiceImpl(AutenticadorLocal(repo), repo, criar_token)


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
