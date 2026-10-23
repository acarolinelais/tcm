from datetime import datetime
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from src.application.schemas.usuario import AtualizarUsuarioRequest, CriarUsuarioRequest
from src.application.services.usuario_service import UsuarioServiceImpl
from src.domain.common.exceptions import ConflictException, NotFoundException
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.usuario import Usuario


@pytest.fixture
def repo():
    return AsyncMock(existe_email=AsyncMock(return_value=False))


@pytest.fixture
def uow():
    return AsyncMock()


@pytest.fixture
def service(repo, uow):
    return UsuarioServiceImpl(repo, uow)


@pytest.fixture
def usuario_atual():
    return UsuarioAutenticado(id=uuid4(), unidade_id=uuid4(), admin_unidade=True)


async def test_criar_usuario_valido_chama_adicionar_e_commit(service, repo, uow, usuario_atual):
    request = CriarUsuarioRequest(nome="Ana", email="ana@example.com")

    resposta = await service.criar(usuario_atual, request)

    repo.adicionar.assert_called_once()
    uow.commit.assert_called_once()
    assert resposta.nome == "Ana"
    assert resposta.email == "ana@example.com"


async def test_atualizar_usuario_valido_retorna_response_atualizado(
    service, repo, uow, usuario_atual
):
    usuario = Usuario(usuario_atual.unidade_id, "Ana", "ana@example.com")
    usuario.created_at = datetime.now()  # simula entidade já persistida, vinda do repositório
    repo.obter_por_id.return_value = usuario
    request = AtualizarUsuarioRequest(nome="Ana Paula", email="ana@example.com")

    resposta = await service.atualizar(usuario_atual, usuario.id, request)

    assert resposta.nome == "Ana Paula"
    repo.atualizar.assert_called_once_with(usuario)
    uow.commit.assert_called_once()


async def test_criar_email_duplicado_levanta_conflict_falha(service, repo, uow, usuario_atual):
    repo.existe_email.return_value = True
    request = CriarUsuarioRequest(nome="Ana", email="ana@example.com")

    with pytest.raises(ConflictException):
        await service.criar(usuario_atual, request)

    repo.adicionar.assert_not_called()
    uow.commit.assert_not_called()


async def test_obter_usuario_inexistente_levanta_notfound_falha(service, repo, usuario_atual):
    repo.obter_por_id.return_value = None

    with pytest.raises(NotFoundException):
        await service.obter(usuario_atual, uuid4())


async def test_inativar_usuario_inexistente_levanta_notfound_falha(
    service, repo, uow, usuario_atual
):
    repo.obter_por_id.return_value = None

    with pytest.raises(NotFoundException):
        await service.inativar(usuario_atual, uuid4())

    uow.commit.assert_not_called()
