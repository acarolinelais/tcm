from datetime import datetime
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from src.api.dependencies import get_importacao_sdf_service, get_usuario_atual
from src.application.schemas.importacao_sdf import (
    DesfazerImportacaoSdfResponse,
    UltimaImportacaoSdfResponse,
)
from src.domain.common.exceptions import (
    ConflictException,
    ForbiddenException,
    NotFoundException,
)
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from tests.functional.conftest import dependency_override


def _preparar(service):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "GERENTE")
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_importacao_sdf_service] = dependency_override(service)
    return usuario


async def test_ultima_importacao_retorna_o_que_o_dialogo_mostra(api_client):
    service = AsyncMock()
    importacao_id, projeto_id = uuid4(), uuid4()
    service.obter_ultima.return_value = UltimaImportacaoSdfResponse(
        id=importacao_id,
        sdf_id="456789-990123",
        device="SM-S948B",
        data_execucao=datetime(2026, 11, 6, 18, 43),
        importado_por_nome="Ana",
        importado_em=datetime(2026, 11, 7, 9),
    )
    usuario = _preparar(service)

    response = await api_client.get(f"/api/projetos/{projeto_id}/relatorios-sdf/ultimo")

    assert response.status_code == 200
    assert response.json()["sdf_id"] == "456789-990123"
    service.obter_ultima.assert_awaited_once_with(usuario, projeto_id)


async def test_sem_importacao_ativa_retorna_null(api_client):
    # CA-09.
    service = AsyncMock()
    service.obter_ultima.return_value = None
    _preparar(service)

    response = await api_client.get(f"/api/projetos/{uuid4()}/relatorios-sdf/ultimo")

    assert (response.status_code, response.json()) == (200, None)


async def test_desfazer_retorna_200_com_os_casos_revertidos(api_client):
    service = AsyncMock()
    service.desfazer.return_value = DesfazerImportacaoSdfResponse(casos_revertidos=2)
    projeto_id, importacao_id = uuid4(), uuid4()
    usuario = _preparar(service)

    response = await api_client.post(
        f"/api/projetos/{projeto_id}/relatorios-sdf/{importacao_id}/desfazer"
    )

    assert (response.status_code, response.json()) == (200, {"casos_revertidos": 2})
    service.desfazer.assert_awaited_once_with(usuario, projeto_id, importacao_id)


@pytest.mark.parametrize(
    ("erro", "status"),
    [
        (ForbiddenException("Sem permissão."), 403),  # CA-08
        (NotFoundException("Importação não encontrada."), 404),  # CA-09 e CA-11
        (ConflictException("Esta importação não é mais a última do projeto."), 409),  # CA-10
    ],
)
async def test_falha_desfazer_retorna_problem_details(api_client, erro, status):
    service = AsyncMock()
    service.desfazer.side_effect = erro
    _preparar(service)

    response = await api_client.post(f"/api/projetos/{uuid4()}/relatorios-sdf/{uuid4()}/desfazer")

    assert response.status_code == status
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json()["status"] == status
