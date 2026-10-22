from datetime import datetime
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from src.application.schemas.usuario import AtualizarUsuarioRequest, CriarUsuarioRequest
from src.application.services.usuario_service import UsuarioServiceImpl
from src.domain.common.exceptions import ConflictException, NotFoundException
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


async def test_criar_usuario_valido_chama_adicionar_e_commit(service, repo, uow):
    request = CriarUsuarioRequest(nome="Ana", email="ana@example.com")

    resposta = await service.criar(request)

    repo.adicionar.assert_called_once()
    uow.commit.assert_called_once()
    assert resposta.nome == "Ana"
    assert resposta.email == "ana@example.com"


async def test_atualizar_usuario_valido_retorna_response_atualizado(service, repo, uow):
    usuario = Usuario("Ana", "ana@example.com")
    usuario.created_at = datetime.now()  # simula entidade já persistida, vinda do repositório
    repo.obter_por_id.return_value = usuario
    request = AtualizarUsuarioRequest(nome="Ana Paula", email="ana@example.com")

    resposta = await service.atualizar(usuario.id, request)

    assert resposta.nome == "Ana Paula"
    uow.commit.assert_called_once()


async def test_criar_email_duplicado_levanta_conflict_falha(service, repo, uow):
    repo.existe_email.return_value = True
    request = CriarUsuarioRequest(nome="Ana", email="ana@example.com")

    with pytest.raises(ConflictException):
        await service.criar(request)

    repo.adicionar.assert_not_called()
    uow.commit.assert_not_called()


async def test_obter_usuario_inexistente_levanta_notfound_falha(service, repo):
    repo.obter_por_id.return_value = None

    with pytest.raises(NotFoundException):
        await service.obter(uuid4())


async def test_inativar_usuario_inexistente_levanta_notfound_falha(service, repo, uow):
    repo.obter_por_id.return_value = None

    with pytest.raises(NotFoundException):
        await service.inativar(uuid4())

    uow.commit.assert_not_called()
