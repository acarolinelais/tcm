from datetime import UTC, datetime
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from src.api.dependencies import get_auditoria_service, get_usuario_atual
from src.application.schemas.auditoria import AlteracaoResponse, RegistroAuditoriaResponse
from src.application.services.auditoria_service import AuditoriaServiceImpl
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.queries.auditoria import AcaoAuditoria, OrigemAuditoria
from tests.functional.conftest import dependency_override

# Spec 052: GET /api/auditoria.

ADMIN = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")


def _servico_real(app, usuario):
    auditoria = AsyncMock()
    auditoria.listar.return_value = PagedResult([], 1, 20, 0)
    usuarios = AsyncMock()
    usuarios.dados_por_usuarios.return_value = {}
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_auditoria_service] = dependency_override(
        AuditoriaServiceImpl(auditoria, usuarios)
    )
    return auditoria


async def test_admin_recebe_a_pagina_com_os_filtros_repassados(api_client):
    from src.api.main import app

    caso_id, projeto_id, ana, bia = uuid4(), uuid4(), uuid4(), uuid4()
    service = AsyncMock()
    service.listar.return_value = PagedResult(
        [
            RegistroAuditoriaResponse(
                id=1284,
                alterado_em=datetime(2026, 10, 30, 15, 42, tzinfo=UTC),
                usuario_nome="Ana Souza",
                usuario_perfil="Key Person",
                acao=AcaoAuditoria.ALTERACAO,
                caso_teste_id=caso_id,
                tc_id="Clock_001",
                projeto_id=projeto_id,
                projeto_nome="Clock 9.5",
                alteracoes=[
                    AlteracaoResponse(
                        campo="status", valor_anterior="InProgress", valor_novo="InReview"
                    )
                ],
                origem="api",
                tela="/projetos/abc/kanban",
            )
        ],
        2,
        20,
        21,
    )
    app.dependency_overrides[get_usuario_atual] = dependency_override(ADMIN)
    app.dependency_overrides[get_auditoria_service] = dependency_override(service)

    response = await api_client.get(
        "/api/auditoria",
        params=[
            ("page", "2"),
            ("data_inicio", "2026-10-01"),
            ("data_fim", "2026-10-30"),
            ("fuso_horario", "America/Sao_Paulo"),
            ("usuario_id", str(ana)),
            ("usuario_id", str(bia)),
            ("acao", "alteracao"),
            ("origem", "form_factor"),
            ("tc_id", "Clock"),
            ("projeto_id", str(projeto_id)),
            ("perfil", "Key Person"),
            ("tela", "kanban"),
        ],
    )

    assert response.status_code == 200
    corpo = response.json()
    assert (corpo["page"], corpo["page_size"], corpo["total_count"]) == (2, 20, 21)
    assert corpo["items"][0]["alteracoes"] == [
        {"campo": "status", "valor_anterior": "InProgress", "valor_novo": "InReview"}
    ]
    assert corpo["items"][0]["alterado_em"] == "2026-10-30T15:42:00Z"
    service.listar.assert_awaited_once_with(
        ADMIN,
        2,
        20,
        data_inicio="2026-10-01",
        data_fim="2026-10-30",
        fuso_horario="America/Sao_Paulo",
        usuario_ids=[ana, bia],
        perfil="Key Person",
        acao=AcaoAuditoria.ALTERACAO,
        tc_id="Clock",
        projeto_id=projeto_id,
        origem=OrigemAuditoria.FORM_FACTOR,
        tela="kanban",
    )


@pytest.mark.parametrize("perfil", ["GERENTE", "KP", "DEV"])
async def test_falha_quem_nao_e_admin_recebe_403_em_problem_details(api_client, perfil):
    from src.api.main import app

    auditoria = _servico_real(app, UsuarioAutenticado(uuid4(), uuid4(), perfil))

    response = await api_client.get("/api/auditoria")

    assert response.status_code == 403
    assert response.headers["content-type"].startswith("application/problem+json")
    auditoria.listar.assert_not_awaited()


@pytest.mark.parametrize(
    "params",
    [
        {"data_inicio": "2026-10-30", "data_fim": "2026-10-29"},
        {"acao": "exclusao"},
        {"origem": "planilha"},
        {"fuso_horario": "Lua/Base"},
    ],
)
async def test_falha_filtro_invalido_recebe_422(api_client, params):
    from src.api.main import app

    auditoria = _servico_real(app, ADMIN)

    response = await api_client.get("/api/auditoria", params=params)

    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/problem+json")
    auditoria.listar.assert_not_awaited()


async def test_falha_sem_token_recebe_401(api_client):
    response = await api_client.get("/api/auditoria")

    assert response.status_code == 401
