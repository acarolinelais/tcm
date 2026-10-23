from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from src.api.dependencies import get_setor_service, get_usuario_atual
from src.application.schemas.setor import SetorResponse
from src.domain.common.exceptions import ForbiddenException
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from tests.functional.conftest import dependency_override


@pytest.mark.asyncio
async def test_criar_setor_como_admin_retorna_201(api_client):
    from src.api.main import app

    atual = UsuarioAutenticado(uuid4(), uuid4(), True)
    service = AsyncMock()
    service.criar.return_value = SetorResponse(
        id=uuid4(), unidade_id=atual.unidade_id, nome="Engenharia", ativo=True
    )
    app.dependency_overrides[get_usuario_atual] = dependency_override(atual)
    app.dependency_overrides[get_setor_service] = dependency_override(service)
    response = await api_client.post("/api/setores", json={"nome": "Engenharia"})
    assert response.status_code == 201
    assert response.json()["unidade_id"] == str(atual.unidade_id)


@pytest.mark.asyncio
async def test_criar_setor_sem_permissao_retorna_403(api_client):
    from src.api.main import app

    atual = UsuarioAutenticado(uuid4(), uuid4(), False)
    service = AsyncMock()
    service.criar.side_effect = ForbiddenException("Sem permissão.")
    app.dependency_overrides[get_usuario_atual] = dependency_override(atual)
    app.dependency_overrides[get_setor_service] = dependency_override(service)
    response = await api_client.post("/api/setores", json={"nome": "Engenharia"})
    assert response.status_code == 403
