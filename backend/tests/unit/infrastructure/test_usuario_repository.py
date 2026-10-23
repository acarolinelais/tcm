from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from src.infrastructure.data.models.usuario_model import UsuarioModel
from src.infrastructure.repositories.usuario_repository import UsuarioRepositoryImpl


@pytest.fixture
def session():
    session = MagicMock()
    session.execute = AsyncMock(return_value=MagicMock())
    return session


@pytest.fixture
def repo(session):
    return UsuarioRepositoryImpl(session)


async def test_obter_por_email_retorna_none_quando_nao_encontrado(repo, session):
    session.execute.return_value.scalar_one_or_none.return_value = None

    resultado = await repo.obter_por_email("ana@example.com")

    assert resultado is None


async def test_obter_por_email_retorna_usuario_quando_encontrado(repo, session):
    unidade_id = uuid4()
    session.execute.return_value.scalar_one_or_none.return_value = UsuarioModel(
        id=uuid4(), unidade_id=unidade_id, nome="Ana", email="ana@example.com", ativo=True
    )

    resultado = await repo.obter_por_email("ana@example.com")

    assert resultado is not None
    assert resultado.email == "ana@example.com"
    assert resultado.unidade_id == unidade_id
