from datetime import datetime
from unittest.mock import AsyncMock
from uuid import uuid4

from src.api.dependencies import get_bug_report_service, get_usuario_atual
from src.application.services.bug_report_service import BugReportServiceImpl
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.queries.bug_report import CasoComFalhas, FalhaSdf, FiltrosBugReport
from tests.functional.conftest import dependency_override

# Spec 072: GET /api/bug-reports, um item por caso com as falhas dele.

CONSULTAR = frozenset({"form_factor.consultar"})


def _usar(usuario, repo):
    from src.api.main import app

    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_bug_report_service] = dependency_override(
        BugReportServiceImpl(repo)
    )


async def test_lista_os_casos_com_as_falhas_e_os_filtros(api_client):
    # Spec 072, CA-01.
    kp = UsuarioAutenticado(uuid4(), uuid4(), "KP", permissoes=CONSULTAR, time_ids=(uuid4(),))
    projeto_id, modelo_id = uuid4(), uuid4()
    falha = FalhaSdf(modelo_id, "SM-1234", "SDF-5", "FAIL", "Crash", datetime(2026, 11, 5, 9))
    repo = AsyncMock()
    repo.listar_casos_com_falhas.return_value = PagedResult(
        [CasoComFalhas(uuid4(), "Clock_000002", "To-Do", uuid4(), uuid4(), "ana.s", None, None,
                       None, (falha,))],
        2,
        20,
        25,
    )  # fmt: skip
    _usar(kp, repo)

    response = await api_client.get(
        "/api/bug-reports",
        params={"page": 2, "projeto_id": str(projeto_id), "modelo_dispositivo_id": str(modelo_id),
                "responsavel": " ana ", "dev_fix": "bia"},
    )  # fmt: skip

    assert response.status_code == 200
    corpo = response.json()
    assert (corpo["page"], corpo["page_size"], corpo["total_count"]) == (2, 20, 25)
    caso = corpo["items"][0]
    assert (caso["tc_id"], caso["dev_fix_id"]) == ("Clock_000002", None)
    assert [(f["modelo_nome"], f["descricao"]) for f in caso["falhas"]] == [("SM-1234", "Crash")]
    args = repo.listar_casos_com_falhas.await_args.args
    assert args[2] == FiltrosBugReport(
        projeto_id=projeto_id, modelo_dispositivo_id=modelo_id, responsavel=" ana ", dev_fix="bia"
    )
    assert args[3:] == (2, 20)


async def test_sem_projeto_retorna_422(api_client):
    _usar(UsuarioAutenticado(uuid4(), uuid4(), "KP", permissoes=CONSULTAR), AsyncMock())

    response = await api_client.get("/api/bug-reports")

    assert response.status_code == 422


async def test_sem_permissao_retorna_403(api_client):
    _usar(UsuarioAutenticado(uuid4(), uuid4(), "KP"), AsyncMock())

    response = await api_client.get("/api/bug-reports", params={"projeto_id": str(uuid4())})

    assert response.status_code == 403
    assert response.headers["content-type"].startswith("application/problem+json")


async def test_parametro_invalido_retorna_422(api_client):
    _usar(UsuarioAutenticado(uuid4(), uuid4(), "KP", permissoes=CONSULTAR), AsyncMock())

    response = await api_client.get(
        "/api/bug-reports", params={"projeto_id": str(uuid4()), "dia": "06/11/2026"}
    )

    assert response.status_code == 422


async def test_sem_token_retorna_401(api_client):
    response = await api_client.get("/api/bug-reports", params={"projeto_id": str(uuid4())})

    assert response.status_code == 401
