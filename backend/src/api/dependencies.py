from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.services.usuario_service import UsuarioServiceImpl
from src.infrastructure.data.session import get_session as get_session
from src.infrastructure.data.unit_of_work import UnitOfWorkImpl
from src.infrastructure.repositories.usuario_repository import UsuarioRepositoryImpl


def get_usuario_service(session: AsyncSession = Depends(get_session)) -> UsuarioServiceImpl:
    repo = UsuarioRepositoryImpl(session)
    uow = UnitOfWorkImpl(session)
    return UsuarioServiceImpl(repo, uow)
