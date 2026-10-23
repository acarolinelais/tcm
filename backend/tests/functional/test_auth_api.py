from unittest.mock import AsyncMock

import pytest
from src.api.dependencies import get_auth_service
from src.application.schemas.auth import TokenResponse
from src.domain.common.exceptions import CredenciaisInvalidasException
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
