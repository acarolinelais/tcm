from datetime import datetime
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from src.api.dependencies import get_usuario_atual, get_usuario_service
from src.application.schemas.usuario import UsuarioResponse
from src.domain.common.exceptions import ForbiddenException
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from tests.functional.conftest import dependency_override


@pytest.mark.asyncio
async def test_admin_transfere_responsabilidade_por_endpoint(api_client):
    from src.api.main import app

    admin = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    usuario_id, gerente_id = uuid4(), uuid4()
    service = AsyncMock()
    service.atribuir_responsavel.return_value = UsuarioResponse(
        id=usuario_id,
        nome="Carol",
        email="carol@example.com",
        ativo=True,
        perfil_id=uuid4(),
        responsavel_id=gerente_id,
        created_at=datetime.now(),
    )
    app.dependency_overrides[get_usuario_atual] = dependency_override(admin)
    app.dependency_overrides[get_usuario_service] = dependency_override(service)

    response = await api_client.patch(
        f"/api/usuarios/{usuario_id}/responsavel", json={"responsavel_id": str(gerente_id)}
    )

    assert response.status_code == 200
    assert response.json()["responsavel_id"] == str(gerente_id)
    service.atribuir_responsavel.assert_awaited_once_with(admin, usuario_id, gerente_id)


@pytest.mark.asyncio
async def test_transferir_responsabilidade_sem_admin_retorna_403(api_client):
    from src.api.main import app

    gerente = UsuarioAutenticado(uuid4(), uuid4(), "GERENTE")
    service = AsyncMock()
    service.atribuir_responsavel.side_effect = ForbiddenException(
        "Apenas o administrador pode atribuir responsáveis."
    )
    app.dependency_overrides[get_usuario_atual] = dependency_override(gerente)
    app.dependency_overrides[get_usuario_service] = dependency_override(service)

    response = await api_client.patch(
        f"/api/usuarios/{uuid4()}/responsavel", json={"responsavel_id": str(uuid4())}
    )

    assert response.status_code == 403
    service.atribuir_responsavel.assert_awaited_once()
