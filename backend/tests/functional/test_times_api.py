from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from src.api.dependencies import get_time_service, get_usuario_atual
from src.application.schemas.time import TimeMembroResponse, TimeResponse
from src.domain.common.exceptions import ForbiddenException
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from tests.functional.conftest import dependency_override


@pytest.mark.asyncio
async def test_criar_time_como_admin_retorna_201(api_client):
    from src.api.main import app

    atual = UsuarioAutenticado(uuid4(), uuid4(), True)
    setor_id, gerente_id = uuid4(), uuid4()
    service = AsyncMock()
    service.criar.return_value = TimeResponse(
        id=uuid4(),
        unidade_id=atual.unidade_id,
        setor_id=setor_id,
        nome="Backend",
        gerente_id=gerente_id,
        ativo=True,
    )
    app.dependency_overrides[get_usuario_atual] = dependency_override(atual)
    app.dependency_overrides[get_time_service] = dependency_override(service)
    response = await api_client.post(
        "/api/times",
        json={"nome": "Backend", "setor_id": str(setor_id), "gerente_id": str(gerente_id)},
    )
    assert response.status_code == 201


@pytest.mark.asyncio
async def test_adicionar_membro_retorna_associacao_sem_papel(api_client):
    from src.api.main import app

    atual = UsuarioAutenticado(uuid4(), uuid4(), True)
    time_id, usuario_id = uuid4(), uuid4()
    service = AsyncMock()
    service.adicionar_membro.return_value = TimeMembroResponse(
        id=uuid4(),
        unidade_id=atual.unidade_id,
        time_id=time_id,
        usuario_id=usuario_id,
        ativo=True,
    )
    app.dependency_overrides[get_usuario_atual] = dependency_override(atual)
    app.dependency_overrides[get_time_service] = dependency_override(service)
    added = await api_client.post(
        f"/api/times/{time_id}/membros", json={"usuario_id": str(usuario_id)}
    )
    assert added.status_code == 201
    assert "papel" not in added.json()


@pytest.mark.asyncio
async def test_gerente_sem_posse_retorna_403(api_client):
    from src.api.main import app

    atual = UsuarioAutenticado(uuid4(), uuid4(), False)
    service = AsyncMock()
    service.adicionar_membro.side_effect = ForbiddenException("Sem permissão.")
    app.dependency_overrides[get_usuario_atual] = dependency_override(atual)
    app.dependency_overrides[get_time_service] = dependency_override(service)
    response = await api_client.post(
        f"/api/times/{uuid4()}/membros", json={"usuario_id": str(uuid4())}
    )
    assert response.status_code == 403
