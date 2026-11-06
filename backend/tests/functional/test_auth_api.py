from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from src.api.dependencies import get_auth_service, get_usuario_atual_para_troca_senha
from src.application.schemas.auth import PreferenciasResponse, SessaoEmitida
from src.domain.common.exceptions import CredenciaisInvalidasException
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from tests.functional.conftest import dependency_override


@pytest.mark.asyncio
async def test_login_credenciais_validas_retorna_token(api_client):
    service = AsyncMock()
    service.login.return_value = SessaoEmitida(access_token="jwt-valido", refresh_token="r" * 64)
    from src.api.main import app

    app.dependency_overrides[get_auth_service] = dependency_override(service)
    response = await api_client.post(
        "/api/auth/login", json={"email": "admin@sdfmanager.com", "senha": "senha"}
    )
    assert response.status_code == 200
    assert response.json() == {
        "access_token": "jwt-valido",
        "expires_in": 900,
        "token_type": "bearer",
    }


@pytest.mark.asyncio
async def test_login_credenciais_invalidas_retorna_401(api_client):
    service = AsyncMock()
    service.login.side_effect = CredenciaisInvalidasException("Credenciais inválidas.")
    from src.api.main import app

    app.dependency_overrides[get_auth_service] = dependency_override(service)
    response = await api_client.post(
        "/api/auth/login", json={"email": "admin@sdfmanager.com", "senha": "errada"}
    )
    assert response.status_code == 401
    assert "email" not in response.text.lower()
    assert "senha" not in response.text.lower()


@pytest.mark.asyncio
async def test_endpoint_protegido_sem_token_retorna_401(api_client):
    response = await api_client.get("/api/usuarios")
    assert response.status_code == 401
    assert response.headers["content-type"] == "application/problem+json"


@pytest.mark.asyncio
async def test_atualizar_preferencia_de_idioma_requer_sessao_e_persiste(api_client):
    service = AsyncMock()
    service.atualizar_preferencias.return_value = PreferenciasResponse(
        idioma_preferido="ko", cor_avatar="azul"
    )
    atual = UsuarioAutenticado(uuid4(), uuid4(), "USUARIO_PADRAO")
    from src.api.main import app

    app.dependency_overrides[get_auth_service] = dependency_override(service)
    app.dependency_overrides[get_usuario_atual_para_troca_senha] = dependency_override(atual)

    response = await api_client.patch("/api/auth/preferencias", json={"idioma_preferido": "ko"})

    assert response.status_code == 200
    assert response.json() == {"idioma_preferido": "ko", "cor_avatar": "azul"}
    service.atualizar_preferencias.assert_awaited_once()


@pytest.mark.asyncio
async def test_atualizar_cor_do_avatar_devolve_as_preferencias_salvas(api_client):
    service = AsyncMock()
    service.atualizar_preferencias.return_value = PreferenciasResponse(
        idioma_preferido="pt-BR", cor_avatar="verde"
    )
    atual = UsuarioAutenticado(uuid4(), uuid4(), "USUARIO_PADRAO")
    from src.api.main import app

    app.dependency_overrides[get_auth_service] = dependency_override(service)
    app.dependency_overrides[get_usuario_atual_para_troca_senha] = dependency_override(atual)

    response = await api_client.patch("/api/auth/preferencias", json={"cor_avatar": "verde"})

    assert response.status_code == 200
    assert response.json() == {"idioma_preferido": "pt-BR", "cor_avatar": "verde"}
    unidade_id, usuario_id, request = service.atualizar_preferencias.await_args.args
    assert (unidade_id, usuario_id) == (atual.unidade_id, atual.id)
    assert request.model_fields_set == {"cor_avatar"}


@pytest.mark.asyncio
async def test_atualizar_cor_do_avatar_recusa_valor_fora_da_paleta(api_client):
    service = AsyncMock()
    from src.api.main import app

    app.dependency_overrides[get_auth_service] = dependency_override(service)
    app.dependency_overrides[get_usuario_atual_para_troca_senha] = dependency_override(
        UsuarioAutenticado(uuid4(), uuid4(), "USUARIO_PADRAO")
    )
    response = await api_client.patch("/api/auth/preferencias", json={"cor_avatar": "dourado"})

    assert response.status_code == 422
    assert response.headers["content-type"] == "application/problem+json"
    service.atualizar_preferencias.assert_not_awaited()


@pytest.mark.asyncio
async def test_atualizar_preferencias_sem_token_retorna_401(api_client):
    service = AsyncMock()
    from src.api.main import app

    app.dependency_overrides[get_auth_service] = dependency_override(service)
    response = await api_client.patch("/api/auth/preferencias", json={"cor_avatar": "verde"})

    assert response.status_code == 401
    service.atualizar_preferencias.assert_not_awaited()


@pytest.mark.asyncio
async def test_atualizar_preferencia_de_idioma_rejeita_codigo_nao_suportado(api_client):
    from src.api.main import app

    app.dependency_overrides[get_auth_service] = dependency_override(AsyncMock())
    app.dependency_overrides[get_usuario_atual_para_troca_senha] = dependency_override(
        UsuarioAutenticado(uuid4(), uuid4(), "USUARIO_PADRAO")
    )
    response = await api_client.patch("/api/auth/preferencias", json={"idioma_preferido": "fr"})
    assert response.status_code == 422


def _cookie_refresh(response) -> str:
    return next(
        valor
        for chave, valor in response.headers.multi_items()
        if chave == "set-cookie" and valor.startswith("sdf_refresh=")
    )


@pytest.mark.asyncio
async def test_login_grava_cookie_de_refresh(api_client):
    service = AsyncMock()
    service.login.return_value = SessaoEmitida(access_token="jwt", refresh_token="r" * 64)
    from src.api.main import app

    app.dependency_overrides[get_auth_service] = dependency_override(service)
    response = await api_client.post(
        "/api/auth/login", json={"email": "admin@sdfmanager.com", "senha": "senha"}
    )
    assert response.status_code == 200
    assert "refresh_token" not in response.json()
    cookie = _cookie_refresh(response).lower()
    assert cookie.startswith("sdf_refresh=" + "r" * 64)
    for atributo in ("httponly", "samesite=strict", "secure", "path=/api/auth", "max-age=36000"):
        assert atributo in cookie


@pytest.mark.asyncio
async def test_login_sem_secure_quando_cookie_secure_false(api_client, monkeypatch):
    monkeypatch.setenv("COOKIE_SECURE", "false")
    service = AsyncMock()
    service.login.return_value = SessaoEmitida(access_token="jwt", refresh_token="r" * 64)
    from src.api.main import app

    app.dependency_overrides[get_auth_service] = dependency_override(service)
    response = await api_client.post(
        "/api/auth/login", json={"email": "admin@sdfmanager.com", "senha": "senha"}
    )
    cookie = _cookie_refresh(response).lower()
    assert "secure" not in cookie
    assert "httponly" in cookie and "samesite=strict" in cookie


@pytest.mark.asyncio
async def test_refresh_sem_cookie_retorna_401(api_client):
    service = AsyncMock()
    from src.api.main import app

    app.dependency_overrides[get_auth_service] = dependency_override(service)
    response = await api_client.post("/api/auth/refresh")
    assert response.status_code == 401
    service.renovar.assert_not_awaited()


@pytest.mark.asyncio
async def test_refresh_com_cookie_invalido_retorna_401(api_client):
    service = AsyncMock()
    service.renovar.side_effect = CredenciaisInvalidasException("Credenciais inválidas.")
    from src.api.main import app

    app.dependency_overrides[get_auth_service] = dependency_override(service)
    response = await api_client.post(
        "/api/auth/refresh", headers={"Cookie": "sdf_refresh=invalido"}
    )
    assert response.status_code == 401
    assert response.headers["content-type"] == "application/problem+json"


@pytest.mark.asyncio
async def test_refresh_rotaciona_o_cookie(api_client):
    service = AsyncMock()
    service.renovar.return_value = SessaoEmitida(access_token="jwt-novo", refresh_token="n" * 64)
    from src.api.main import app

    app.dependency_overrides[get_auth_service] = dependency_override(service)
    response = await api_client.post(
        "/api/auth/refresh", headers={"Cookie": "sdf_refresh=" + "v" * 64}
    )
    assert response.status_code == 200
    assert response.json()["access_token"] == "jwt-novo"
    service.renovar.assert_awaited_once_with("v" * 64)
    assert _cookie_refresh(response).startswith("sdf_refresh=" + "n" * 64)


@pytest.mark.asyncio
async def test_trocar_senha_grava_cookie_novo(api_client):
    service = AsyncMock()
    service.alterar_senha_inicial.return_value = SessaoEmitida(
        access_token="jwt", refresh_token="t" * 64
    )
    atual = UsuarioAutenticado(
        uuid4(), uuid4(), "USUARIO_PADRAO", sessao_id=uuid4(), senha_alteracao_obrigatoria=True
    )
    from src.api.main import app

    app.dependency_overrides[get_auth_service] = dependency_override(service)
    app.dependency_overrides[get_usuario_atual_para_troca_senha] = dependency_override(atual)
    response = await api_client.post("/api/auth/trocar-senha", json={"nova_senha": "nova"})
    assert response.status_code == 200
    assert "refresh_token" not in response.json()
    assert _cookie_refresh(response).startswith("sdf_refresh=" + "t" * 64)


@pytest.mark.asyncio
async def test_logout_apaga_cookie_mesmo_sem_access_token(api_client):
    service = AsyncMock()
    from src.api.main import app

    app.dependency_overrides[get_auth_service] = dependency_override(service)
    response = await api_client.post(
        "/api/auth/logout", headers={"Cookie": "sdf_refresh=" + "v" * 64}
    )
    assert response.status_code == 204
    service.logout.assert_awaited_once_with("v" * 64, None)
    cookie = _cookie_refresh(response).lower()
    assert "max-age=0" in cookie and "path=/api/auth" in cookie


@pytest.mark.asyncio
async def test_logout_sem_cookie_responde_204_sem_revogar(api_client):
    service = AsyncMock()
    from src.api.main import app

    app.dependency_overrides[get_auth_service] = dependency_override(service)
    response = await api_client.post("/api/auth/logout")
    assert response.status_code == 204
    service.logout.assert_not_awaited()


@pytest.mark.asyncio
async def test_logout_revoga_tambem_a_sessao_do_access_token(api_client):
    from src.domain.entities.usuario import Usuario
    from src.infrastructure.security.jwt import criar_token

    service = AsyncMock()
    sessao_id = uuid4()
    token = criar_token(Usuario(uuid4(), "Ana", "ana@example.com"), sessao_id=sessao_id)
    from src.api.main import app

    app.dependency_overrides[get_auth_service] = dependency_override(service)
    response = await api_client.post(
        "/api/auth/logout",
        headers={"Cookie": "sdf_refresh=" + "v" * 64, "Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 204
    service.logout.assert_awaited_once_with("v" * 64, sessao_id)


@pytest.mark.asyncio
async def test_logout_com_access_token_invalido_ignora_o_token(api_client):
    service = AsyncMock()
    from src.api.main import app

    app.dependency_overrides[get_auth_service] = dependency_override(service)
    response = await api_client.post(
        "/api/auth/logout", headers={"Authorization": "Bearer nao-e-um-jwt"}
    )
    assert response.status_code == 204
    service.logout.assert_not_awaited()
