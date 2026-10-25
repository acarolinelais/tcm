from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from src.api.dependencies import get_caso_teste_service, get_projeto_service, get_usuario_atual
from src.api.main import app
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from tests.functional.conftest import dependency_override


@pytest.mark.parametrize("casos", [False, True])
async def test_filtro_pessoal_repassado_e_lista_vazia(api_client, casos):
    usuario = UsuarioAutenticado(uuid4(), uuid4(), "USUARIO_PADRAO")
    projeto_id = uuid4()
    service = AsyncMock()
    service.listar.return_value = PagedResult([], 1, 20, 0)
    dependencia = get_caso_teste_service if casos else get_projeto_service
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[dependencia] = dependency_override(service)
    rota = f"/api/projetos/{projeto_id}/test-cases" if casos else "/api/projetos"
    resposta = await api_client.get(f"{rota}?associados_a_mim=true")
    assert resposta.status_code == 200
    assert resposta.json()["items"] == []
    assert resposta.json()["total_count"] == 0
    argumentos = (usuario, projeto_id, 1, 20, None, True) if casos else (usuario, 1, 20, True)
    service.listar.assert_awaited_once_with(*argumentos)


@pytest.mark.parametrize("casos", [False, True])
@pytest.mark.parametrize("query", ["associados_a_mim=invalido", "page=0", "page_size=101"])
async def test_parametros_invalidos_retornam_problem_details(api_client, casos, query):
    usuario = UsuarioAutenticado(uuid4(), uuid4(), "USUARIO_PADRAO")
    service = AsyncMock()
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_caso_teste_service if casos else get_projeto_service] = (
        dependency_override(service)
    )
    rota = f"/api/projetos/{uuid4()}/test-cases" if casos else "/api/projetos"
    resposta = await api_client.get(f"{rota}?{query}")
    assert resposta.status_code == 422
    assert resposta.headers["content-type"].startswith("application/problem+json")
    service.listar.assert_not_awaited()


async def test_repassa_semana_e_fuso_para_consulta_de_casos(api_client):
    usuario = UsuarioAutenticado(uuid4(), uuid4(), "USUARIO_PADRAO")
    projeto_id = uuid4()
    service = AsyncMock()
    service.listar.return_value = PagedResult([], 1, 20, 0)
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_caso_teste_service] = dependency_override(service)
    resposta = await api_client.get(
        f"/api/projetos/{projeto_id}/test-cases",
        params={"semana": "2026-W13", "fuso_horario": "America/Manaus", "associados_a_mim": True},
    )
    assert resposta.status_code == 200
    service.listar.assert_awaited_once_with(
        usuario,
        projeto_id,
        1,
        20,
        None,
        True,
        semana="2026-W13",
        fuso_horario="America/Manaus",
    )
