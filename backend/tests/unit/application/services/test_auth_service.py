from unittest.mock import AsyncMock, Mock
from uuid import uuid4

import pytest
from src.application.schemas.auth import LoginRequest
from src.application.services.auth_service import AuthServiceImpl
from src.domain.common.exceptions import CredenciaisInvalidasException
from src.domain.entities.usuario import Usuario


@pytest.fixture
def contexto():
    usuario = Usuario(uuid4(), "Ana", "ana@example.com")
    autenticador = AsyncMock()
    autenticador.autenticar.return_value = usuario.id
    repo = AsyncMock()
    repo.obter_por_email.return_value = usuario
    criar_token = Mock(return_value="token-assinado")
    request = LoginRequest(email=usuario.email, senha="senha-de-teste")
    return (
        AuthServiceImpl(autenticador, repo, criar_token),
        autenticador,
        repo,
        criar_token,
        usuario,
        request,
    )


async def test_login_credenciais_validas_emite_token_do_usuario_local(contexto):
    service, autenticador, repo, criar_token, usuario, request = contexto
    resposta = await service.login(request)
    autenticador.autenticar.assert_awaited_once_with(request.email, request.senha)
    repo.obter_por_email.assert_awaited_once_with(request.email)
    criar_token.assert_called_once_with(usuario)
    assert resposta.access_token == "token-assinado"
    assert resposta.token_type == "bearer"


@pytest.mark.parametrize("motivo", ["credenciais", "ausente", "inativo", "id_divergente"])
async def test_login_invalido_recusa_com_mensagem_generica_sem_emitir_token(contexto, motivo):
    service, autenticador, repo, criar_token, usuario, request = contexto
    if motivo == "credenciais":
        autenticador.autenticar.return_value = None
    elif motivo == "ausente":
        repo.obter_por_email.return_value = None
    elif motivo == "inativo":
        usuario.inativar()
    else:
        autenticador.autenticar.return_value = uuid4()
    with pytest.raises(CredenciaisInvalidasException, match="Credenciais inválidas"):
        await service.login(request)
    criar_token.assert_not_called()
    if motivo == "credenciais":
        repo.obter_por_email.assert_not_awaited()
