from unittest.mock import AsyncMock
from uuid import uuid4

from src.api.dependencies import get_modelo_dispositivo_service, get_usuario_atual
from src.application.schemas.modelo_dispositivo import ModeloDispositivoResponse
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from tests.functional.conftest import dependency_override


async def test_criar_modelo_retorna_201_e_location(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    service = AsyncMock()
    service.criar.return_value = ModeloDispositivoResponse(
        id=uuid4(), unidade_id=usuario.unidade_id, nome="S27 Ultra", ativo=True
    )
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_modelo_dispositivo_service] = dependency_override(service)

    response = await api_client.post("/api/modelos-dispositivo", json={"nome": "S27 Ultra"})

    assert response.status_code == 201
    assert response.headers["location"] == f"/api/modelos-dispositivo/{response.json()['id']}"


async def test_listar_modelos_retorna_resultado_paginado(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    service = AsyncMock()
    service.listar.return_value = PagedResult([], 1, 10, 0)
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_modelo_dispositivo_service] = dependency_override(service)

    response = await api_client.get("/api/modelos-dispositivo?page=1&page_size=10&ativo=true")

    assert response.status_code == 200
    assert response.json()["total_count"] == 0
    service.listar.assert_awaited_once_with(usuario, 1, 10, True, None)


async def test_atualizar_modelo_repassa_campos(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    modelo_id = uuid4()
    service = AsyncMock()
    service.atualizar.return_value = ModeloDispositivoResponse(
        id=modelo_id, unidade_id=usuario.unidade_id, nome="S26 Ultra", ativo=True
    )
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_modelo_dispositivo_service] = dependency_override(service)

    response = await api_client.patch(
        f"/api/modelos-dispositivo/{modelo_id}", json={"nome": "S26 Ultra"}
    )

    assert response.status_code == 200
    assert response.json()["nome"] == "S26 Ultra"
    service.atualizar.assert_awaited_once()
