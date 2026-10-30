from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from src.api.dependencies import get_auth_service, get_usuario_atual_para_troca_senha
from src.application.schemas.auth import PreferenciasResponse, TokenResponse
from src.domain.common.exceptions import CredenciaisInvalidasException
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from tests.functional.conftest import dependency_override


@pytest.mark.asyncio
async def test_login_credenciais_validas_retorna_token(api_client):
    service = AsyncMock()
    service.login.return_value = TokenResponse(access_token="jwt-valido")
    from src.api.main import app

    app.dependency_overrides[get_auth_service] = dependency_override(service)
    response = await api_client.post(
        "/api/auth/login", json={"email": "admin@sdfmanager.com", "senha": "senha"}
    )
    assert response.status_code == 200
    assert response.json() == {
        "access_token": "jwt-valido",
        "refresh_token": "",
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
