from datetime import datetime
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from src.api.dependencies import get_bug_report_service, get_caso_teste_service, get_usuario_atual
from src.application.services.bug_report_service import BugReportServiceImpl
from src.domain.common.exceptions import ConflictException, ForbiddenException
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.caso_teste import StatusCasoTeste
from src.domain.queries.bug_report import CasoComFalhas, FalhaSdf, FiltrosBugReport
from tests.functional.conftest import dependency_override

# Spec 073: a aba My Fixes e a mudança de Status da correção.

CONSULTAR = frozenset({"test_cases.consultar"})


def _override(dependencia, valor):
    from src.api.main import app

    app.dependency_overrides[dependencia] = dependency_override(valor)


async def test_my_fixes_lista_os_casos_do_corretor_com_a_tentativa(api_client):
    dev = UsuarioAutenticado(uuid4(), uuid4(), "USUARIO_PADRAO", permissoes=CONSULTAR,
                             time_ids=(uuid4(),))  # fmt: skip
    projeto_id = uuid4()
    falha = FalhaSdf(uuid4(), "SM-1234", "SDF-5", "FAIL", None, datetime(2026, 11, 5, 9), 2)
    repo = AsyncMock()
    repo.listar_casos_com_falhas.return_value = PagedResult(
        [CasoComFalhas(uuid4(), "Clock_000002", "InFixes", uuid4(), uuid4(), "ana.s", None, dev.id,
                       "caio.r", (falha,), 2, datetime(2026, 11, 6, 10))],
        1,
        20,
        1,
    )  # fmt: skip
    _override(get_usuario_atual, dev)
    _override(get_bug_report_service, BugReportServiceImpl(repo))

    response = await api_client.get(
        "/api/bug-reports/my-fixes",
        params=[("projeto_id", str(projeto_id)), ("status", "InFixes"), ("status", "InReview")],
    )

    assert response.status_code == 200
    caso = response.json()["items"][0]
    assert (caso["tentativa_correcao"], caso["falhas"][0]["tentativa"]) == (2, 2)
    assert caso["correcao_em_revisao_em"] == "2026-11-06T10:00:00Z"
    filtros = repo.listar_casos_com_falhas.await_args.args[2]
    assert filtros == FiltrosBugReport(
        projeto_id=projeto_id, status=("InFixes", "InReview"), em_correcao=True, corretor_id=dev.id
    )


@pytest.mark.parametrize("perfil", ["KP", "GERENTE", "ADMIN_UNIDADE"])
async def test_my_fixes_da_gestao_lista_todos_os_casos_em_correcao_do_escopo(api_client, perfil):
    # Quem gerencia não é corretor de nenhum caso: o filtro por pessoa não vale para ele.
    gestor = UsuarioAutenticado(uuid4(), uuid4(), perfil, permissoes=CONSULTAR,
                                time_ids=(uuid4(),))  # fmt: skip
    projeto_id = uuid4()
    repo = AsyncMock()
    repo.listar_casos_com_falhas.return_value = PagedResult([], 1, 20, 0)
    _override(get_usuario_atual, gestor)
    _override(get_bug_report_service, BugReportServiceImpl(repo))

    response = await api_client.get(
        "/api/bug-reports/my-fixes", params={"projeto_id": str(projeto_id)}
    )

    assert response.status_code == 200
    filtros = repo.listar_casos_com_falhas.await_args.args[2]
    assert (filtros.em_correcao, filtros.corretor_id) == (True, None)


async def test_falha_my_fixes_com_status_fora_da_correcao_retorna_422(api_client):
    _override(get_usuario_atual, UsuarioAutenticado(uuid4(), uuid4(), "KP", permissoes=CONSULTAR))
    _override(get_bug_report_service, AsyncMock())

    response = await api_client.get(
        "/api/bug-reports/my-fixes", params={"projeto_id": str(uuid4()), "status": "Done"}
    )

    assert response.status_code == 422


async def test_reincidentes_chega_ao_filtro_da_sdf_failures(api_client):
    kp = UsuarioAutenticado(uuid4(), uuid4(), "KP", permissoes=frozenset({"form_factor.consultar"}),
                            time_ids=(uuid4(),))  # fmt: skip
    repo = AsyncMock()
    repo.listar_casos_com_falhas.return_value = PagedResult([], 1, 20, 0)
    _override(get_usuario_atual, kp)
    _override(get_bug_report_service, BugReportServiceImpl(repo))

    response = await api_client.get(
        "/api/bug-reports", params={"projeto_id": str(uuid4()), "reincidentes": "true"}
    )

    assert response.status_code == 200
    assert repo.listar_casos_com_falhas.await_args.args[2].reincidentes is True


async def test_patch_da_correcao_repassa_o_status(api_client):
    usuario = UsuarioAutenticado(uuid4(), uuid4(), "USUARIO_PADRAO", permissoes=CONSULTAR)
    service = AsyncMock()
    service.mudar_status_da_correcao.side_effect = ConflictException("fora da correção")
    _override(get_usuario_atual, usuario)
    _override(get_caso_teste_service, service)
    caso_id = uuid4()

    response = await api_client.patch(
        f"/api/test-cases/{caso_id}/correcao", json={"status": "InReview"}
    )

    assert response.status_code == 409
    service.mudar_status_da_correcao.assert_awaited_once_with(
        usuario, caso_id, StatusCasoTeste.IN_REVIEW
    )


async def test_falha_patch_da_correcao_com_status_fora_dos_quatro_retorna_422(api_client):
    service = AsyncMock()
    _override(get_usuario_atual, UsuarioAutenticado(uuid4(), uuid4(), "USUARIO_PADRAO"))
    _override(get_caso_teste_service, service)

    response = await api_client.patch(
        f"/api/test-cases/{uuid4()}/correcao", json={"status": "Done"}
    )

    assert response.status_code == 422
    service.mudar_status_da_correcao.assert_not_awaited()


async def test_falha_patch_da_correcao_de_quem_nao_corrige_retorna_403(api_client):
    service = AsyncMock()
    service.mudar_status_da_correcao.side_effect = ForbiddenException("não corrige")
    _override(get_usuario_atual, UsuarioAutenticado(uuid4(), uuid4(), "USUARIO_PADRAO"))
    _override(get_caso_teste_service, service)

    response = await api_client.patch(
        f"/api/test-cases/{uuid4()}/correcao", json={"status": "InProgress"}
    )

    assert response.status_code == 403
