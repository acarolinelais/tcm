from datetime import UTC, date, datetime
from unittest.mock import AsyncMock
from uuid import uuid4

from src.api.dependencies import get_caso_teste_service, get_usuario_atual
from src.application.schemas.historico_caso_teste import AlteracaoCasoTesteResponse
from src.application.schemas.timeline import (
    CardTimelineResponse,
    PessoaTimelineResponse,
    TimelineResponse,
)
from src.application.services.caso_teste_service import CasoTesteServiceImpl
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from tests.functional.conftest import dependency_override

# Spec 054: GET /api/projetos/{id}/timeline.


def _sobrescrever(usuario, service):
    from src.api.main import app

    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_caso_teste_service] = dependency_override(service)


async def test_timeline_retorna_os_cards_e_repassa_periodo_e_filtros(api_client):
    usuario = UsuarioAutenticado(uuid4(), uuid4(), "GERENTE")
    ana, caso_id, projeto_id, bia = uuid4(), uuid4(), uuid4(), uuid4()
    service = AsyncMock()
    service.timeline.return_value = TimelineResponse(
        pessoas=[PessoaTimelineResponse(id=ana, nome="Ana", cor_avatar="roxo")],
        casos=[],
        cards=[
            CardTimelineResponse(
                caso_teste_id=caso_id,
                tc_id="Clock_00046",
                responsavel_id=ana,
                responsavel_nome="Ana",
                responsavel_cor_avatar="roxo",
                dia=date(2026, 12, 28),
                primeira_em=datetime(2026, 12, 28, 13, tzinfo=UTC),
                alteracoes=[
                    AlteracaoCasoTesteResponse(
                        campo="status",
                        valor_anterior="InProgress",
                        valor_novo="InReview",
                        usuario_nome="Ana",
                        usuario_perfil="Key Person",
                        origem="api",
                        alterado_em=datetime(2026, 12, 28, 13, tzinfo=UTC),
                    )
                ],
            )
        ],
    )
    _sobrescrever(usuario, service)

    response = await api_client.get(
        f"/api/projetos/{projeto_id}/timeline",
        params={
            "inicio": "2026-12-28",
            "fim": "2027-01-03",
            "fuso_horario": "America/Sao_Paulo",
            "responsavel_ids": [str(ana), str(bia)],
            "caso_teste_ids": [str(caso_id)],
        },
    )

    assert response.status_code == 200
    (card,) = response.json()["cards"]
    assert (card["tc_id"], card["dia"], card["primeira_em"]) == (
        "Clock_00046",
        "2026-12-28",
        "2026-12-28T13:00:00Z",
    )
    service.timeline.assert_awaited_once_with(
        usuario,
        projeto_id,
        date(2026, 12, 28),
        date(2027, 1, 3),
        "America/Sao_Paulo",
        [ana, bia],
        [caso_id],
    )


def _service_real(projeto=None):
    projetos, historico = AsyncMock(), AsyncMock()
    projetos.obter_por_id.return_value = projeto
    service = CasoTesteServiceImpl(
        AsyncMock(), projetos, *(AsyncMock() for _ in range(5)), historico_repo=historico
    )
    return service, historico


async def test_falha_projeto_de_outra_unidade_ou_fora_do_escopo_retorna_404(api_client):
    service, historico = _service_real(projeto=None)
    _sobrescrever(UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE"), service)

    response = await api_client.get(
        f"/api/projetos/{uuid4()}/timeline", params={"inicio": "2026-12-28", "fim": "2027-01-03"}
    )

    assert response.status_code == 404
    historico.listar_por_projeto.assert_not_awaited()


async def test_falha_periodo_invertido_ou_longo_demais_retorna_422(api_client):
    service, historico = _service_real()
    _sobrescrever(UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE"), service)
    url = f"/api/projetos/{uuid4()}/timeline"

    invertido = await api_client.get(url, params={"inicio": "2027-01-03", "fim": "2026-12-28"})
    longo = await api_client.get(url, params={"inicio": "2026-12-01", "fim": "2027-01-01"})
    sem_datas = await api_client.get(url)

    assert [invertido.status_code, longo.status_code, sem_datas.status_code] == [422, 422, 422]
    assert "anterior" in invertido.json()["detail"]
    historico.listar_por_projeto.assert_not_awaited()


async def test_falha_sem_permissao_de_consultar_test_cases_retorna_403(api_client):
    service, _ = _service_real()
    _sobrescrever(UsuarioAutenticado(uuid4(), uuid4(), "USUARIO_PADRAO"), service)

    response = await api_client.get(
        f"/api/projetos/{uuid4()}/timeline", params={"inicio": "2026-12-28", "fim": "2027-01-03"}
    )

    assert response.status_code == 403
