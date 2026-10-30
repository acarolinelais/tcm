from unittest.mock import AsyncMock
from uuid import uuid4

from src.api.dependencies import get_overview_service, get_usuario_atual
from src.application.services.overview_service import OverviewServiceImpl
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.queries.resumo_overview import ResumoOverview
from tests.functional.conftest import dependency_override

# Spec 039: GET /api/overview.


def _usar(usuario, repo):
    from src.api.main import app

    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_overview_service] = dependency_override(OverviewServiceImpl(repo))


async def test_overview_retorna_as_contagens_do_gerente(api_client):
    usuario = UsuarioAutenticado(uuid4(), uuid4(), "GERENTE", time_ids=(uuid4(),))
    repo = AsyncMock()
    repo.resumir.return_value = ResumoOverview(10, 4, 3, 3, 2)
    _usar(usuario, repo)

    response = await api_client.get("/api/overview", params={"fuso_horario": "America/Sao_Paulo"})

    assert response.status_code == 200
    corpo = response.json()
    assert {chave: corpo[chave] for chave in ("total", "concluidos", "em_andamento")} == {
        "total": 10,
        "concluidos": 4,
        "em_andamento": 3,
    }
    assert len(corpo["desempenho"]) == 6
    assert repo.resumir.await_args.args[0] == usuario.unidade_id


async def test_overview_fuso_invalido_retorna_422(api_client):
    _usar(UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE"), AsyncMock())

    response = await api_client.get("/api/overview", params={"fuso_horario": "Lua/Crateras"})

    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/problem+json")


async def test_overview_sem_token_retorna_401(api_client):
    response = await api_client.get("/api/overview")

    assert response.status_code == 401
