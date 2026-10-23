from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from src.domain.entities.usuario import Usuario
from src.infrastructure.security.autenticador_local import AutenticadorLocal
from src.infrastructure.security.senha_hasher import hash_senha


@pytest.fixture
def usuario_repo():
    return AsyncMock()


@pytest.fixture
def autenticador(usuario_repo):
    return AutenticadorLocal(usuario_repo)


async def test_autenticar_credenciais_validas_retorna_o_id(autenticador, usuario_repo):
    usuario = Usuario(uuid4(), "Ana", "ana@example.com")
    usuario.definir_senha_hash(hash_senha("senha-123"))
    usuario_repo.obter_por_email.return_value = usuario

    resultado = await autenticador.autenticar("ana@example.com", "senha-123")

    assert resultado == usuario.id


async def test_autenticar_senha_incorreta_retorna_none(autenticador, usuario_repo):
    usuario = Usuario(uuid4(), "Ana", "ana@example.com")
    usuario.definir_senha_hash(hash_senha("senha-123"))
    usuario_repo.obter_por_email.return_value = usuario

    resultado = await autenticador.autenticar("ana@example.com", "senha-errada")

    assert resultado is None


async def test_autenticar_email_inexistente_retorna_none(autenticador, usuario_repo):
    usuario_repo.obter_por_email.return_value = None

    resultado = await autenticador.autenticar("nao-existe@example.com", "senha-123")

    assert resultado is None
