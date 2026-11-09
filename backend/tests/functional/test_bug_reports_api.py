from datetime import datetime
from unittest.mock import AsyncMock
from uuid import uuid4

from src.api.dependencies import get_bug_report_service, get_usuario_atual
from src.application.services.bug_report_service import BugReportServiceImpl
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.queries.bug_report import FalhaAberta, FiltrosBugReport
from tests.functional.conftest import dependency_override

# Spec 070: GET /api/bug-reports.

CONSULTAR = frozenset({"form_factor.consultar"})


def _usar(usuario, repo):
    from src.api.main import app

    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_bug_report_service] = dependency_override(
        BugReportServiceImpl(repo)
    )


async def test_lista_as_falhas_paginadas_com_os_filtros(api_client):
    # CA-01 e CA-06.
    kp = UsuarioAutenticado(uuid4(), uuid4(), "KP", permissoes=CONSULTAR, time_ids=(uuid4(),))
    caso_id, projeto_id, modelo_id = uuid4(), uuid4(), uuid4()
    repo = AsyncMock()
    repo.listar_falhas_abertas.return_value = PagedResult(
        [
            FalhaAberta(
                caso_id,
                "Clock_000002",
                None,
                "InFixes",
                projeto_id,
                "Clock 9.5",
                uuid4(),
                modelo_id,
                "SM-1234",
                "SDF-5",
                "Crash ao girar a tela",
                datetime(2026, 11, 5, 9),
                uuid4(),
                "ana.s",
                None,
            )  # fmt: skip
        ],
        2,
        20,
        25,
    )
    _usar(kp, repo)

    response = await api_client.get(
        "/api/bug-reports",
        params={"page": 2, "projeto_id": str(projeto_id), "modelo_dispositivo_id": str(modelo_id),
                "responsavel": " ana "},
    )  # fmt: skip

    assert response.status_code == 200
    corpo = response.json()
    assert (corpo["page"], corpo["page_size"], corpo["total_count"]) == (2, 20, 25)
    falha = corpo["items"][0]
    assert (falha["tc_id"], falha["modelo_nome"], falha["motivo"]) == (
        "Clock_000002",
        "SM-1234",
        "Crash ao girar a tela",
    )
    args = repo.listar_falhas_abertas.await_args.args
    assert args[2] == FiltrosBugReport(
        projeto_id=projeto_id, modelo_dispositivo_id=modelo_id, responsavel=" ana "
    )
    assert args[3:] == (2, 20)


async def test_sem_permissao_retorna_403(api_client):
    _usar(UsuarioAutenticado(uuid4(), uuid4(), "KP"), AsyncMock())

    response = await api_client.get("/api/bug-reports")

    assert response.status_code == 403
    assert response.headers["content-type"].startswith("application/problem+json")


async def test_parametro_invalido_retorna_422(api_client):
    _usar(UsuarioAutenticado(uuid4(), uuid4(), "KP", permissoes=CONSULTAR), AsyncMock())

    response = await api_client.get("/api/bug-reports", params={"projeto_id": "clock", "page": 0})

    assert response.status_code == 422


async def test_sem_token_retorna_401(api_client):
    response = await api_client.get("/api/bug-reports")

    assert response.status_code == 401
