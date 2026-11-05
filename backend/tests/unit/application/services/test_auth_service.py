from unittest.mock import AsyncMock, Mock
from uuid import uuid4

import pytest
from src.application.schemas.auth import (
    AtualizarPreferenciasRequest,
    LoginRequest,
    PreferenciasResponse,
)
from src.domain.common.cor_avatar import CorAvatar
from src.domain.common.exceptions import CredenciaisInvalidasException, NotFoundException
from src.domain.common.idioma_preferido import IdiomaPreferido
from src.domain.entities.usuario import Usuario
from src.infrastructure.services.auth_service import AuthServiceImpl


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


async def test_atualizar_preferencias_persiste_idioma_na_conta():
    unidade_id = uuid4()
    usuario = Usuario(unidade_id, "Ana", "ana@example.com")
    usuario_repo = AsyncMock()
    usuario_repo.obter_por_id.return_value = usuario
    session = AsyncMock()
    service = AuthServiceImpl(
        AsyncMock(), usuario_repo, Mock(return_value="token-assinado"), session
    )
    request = AtualizarPreferenciasRequest(idioma_preferido="pt-BR")

    await service.atualizar_preferencias(unidade_id, usuario.id, request)

    assert usuario.idioma_preferido == IdiomaPreferido.PORTUGUES_BR
    usuario_repo.atualizar.assert_awaited_once_with(usuario)
    session.commit.assert_awaited_once_with()


async def test_atualizar_preferencias_so_com_cor_mantem_o_idioma_e_devolve_as_duas():
    unidade_id = uuid4()
    usuario = Usuario(unidade_id, "Ana", "ana@example.com")
    usuario.definir_idioma_preferido(IdiomaPreferido.COREANO)
    usuario_repo = AsyncMock()
    usuario_repo.obter_por_id.return_value = usuario
    session = AsyncMock()
    service = AuthServiceImpl(AsyncMock(), usuario_repo, Mock(), session)

    resposta = await service.atualizar_preferencias(
        unidade_id, usuario.id, AtualizarPreferenciasRequest(cor_avatar="verde")
    )

    assert usuario.cor_avatar == CorAvatar.VERDE
    assert usuario.idioma_preferido == IdiomaPreferido.COREANO
    assert resposta == PreferenciasResponse(idioma_preferido="ko", cor_avatar="verde")
    session.commit.assert_awaited_once_with()


async def test_atualizar_preferencias_so_com_idioma_mantem_a_cor():
    unidade_id = uuid4()
    usuario = Usuario(unidade_id, "Ana", "ana@example.com")
    usuario.definir_cor_avatar(CorAvatar.ROXO)
    usuario_repo = AsyncMock()
    usuario_repo.obter_por_id.return_value = usuario
    service = AuthServiceImpl(AsyncMock(), usuario_repo, Mock(), AsyncMock())

    resposta = await service.atualizar_preferencias(
        unidade_id, usuario.id, AtualizarPreferenciasRequest(idioma_preferido="en")
    )

    assert usuario.cor_avatar == CorAvatar.ROXO
    assert resposta.cor_avatar == CorAvatar.ROXO


async def test_atualizar_preferencias_nao_altera_usuario_de_outra_unidade():
    usuario_repo = AsyncMock()
    usuario_repo.obter_por_id.return_value = None
    session = AsyncMock()
    service = AuthServiceImpl(AsyncMock(), usuario_repo, Mock(), session)

    with pytest.raises(NotFoundException, match="Usuário não encontrado"):
        await service.atualizar_preferencias(
            uuid4(), uuid4(), AtualizarPreferenciasRequest(idioma_preferido="ko")
        )

    usuario_repo.atualizar.assert_not_awaited()
    session.commit.assert_not_awaited()
