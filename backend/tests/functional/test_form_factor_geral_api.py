from datetime import date
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from src.api.dependencies import get_form_factor_service, get_usuario_atual
from src.application.schemas.form_factor import FormFactorModeloResponse
from src.application.schemas.form_factor_historico import (
    CasoHistoricoResponse,
    ExecucaoNaDataResponse,
    HistoricoProjetoResponse,
    ResultadoNaDataResponse,
    ResumoExecucoesResponse,
)
from src.application.services.form_factor_service import FormFactorServiceImpl
from src.domain.common.exceptions import ForbiddenException, NotFoundException
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from tests.functional.conftest import dependency_override

USUARIO = UsuarioAutenticado(
    uuid4(), uuid4(), "KP", permissoes=frozenset({"form_factor.consultar"})
)


def _usar(service):
    from src.api.main import app

    app.dependency_overrides[get_usuario_atual] = dependency_override(USUARIO)
    app.dependency_overrides[get_form_factor_service] = dependency_override(service)


async def test_historico_repassa_filtros_e_devolve_o_pivo(api_client):
    projeto_id, modelo_id, caso_id, execucao_id = (uuid4() for _ in range(4))
    service = AsyncMock()
    service.historico_projeto.return_value = HistoricoProjetoResponse(
        modelos=[FormFactorModeloResponse(id=modelo_id, nome="SM-S26")],
        datas=[date(2026, 10, 10)],
        items=[
            CasoHistoricoResponse(
                caso_teste_id=caso_id,
                tc_id="Clock_001",
                responsavel_id=uuid4(),
                responsavel_identificador="ANA-001",
                backup_id=None,
                rodada_pendente_id=None,
                ultimo_sdf_por_modelo={modelo_id: "SDF-9"},
                resultados={
                    date(2026, 10, 10): {
                        modelo_id: ResultadoNaDataResponse(
                            execucao_id=execucao_id, resultado="PASS", sdf_id=None, origem="MANUAL"
                        )
                    }
                },
            )
        ],
        page=2,
        page_size=10,
        total_count=11,
        total_pages=2,
    )
    _usar(service)

    response = await api_client.get(
        f"/api/form-factor/general/projetos/{projeto_id}/historico?tc_id=001&responsavel=ana"
        f"&sdf_id=SDF&busca=ignorada&modelo_dispositivo_id={modelo_id}&semana=2026-W41"
        "&fuso_horario=America/Manaus&page=2&page_size=10&associados_a_mim=true"
    )

    assert response.status_code == 200
    # A busca livre saiu (spec 059, RN-13): o parâmetro antigo é ignorado.
    service.historico_projeto.assert_awaited_once_with(
        USUARIO,
        projeto_id,
        tc_id="001",
        responsavel="ana",
        sdf_id="SDF",
        modelo_dispositivo_id=modelo_id,
        dia=None,
        semana="2026-W41",
        fuso_horario="America/Manaus",
        page=2,
        page_size=10,
        associados_a_mim=True,
    )
    corpo = response.json()
    assert corpo["datas"] == ["2026-10-10"]
    assert (corpo["page"], corpo["total_count"], corpo["total_pages"]) == (2, 11, 2)
    assert corpo["items"][0]["resultados"]["2026-10-10"][str(modelo_id)]["origem"] == "MANUAL"
    assert corpo["items"][0]["ultimo_sdf_por_modelo"] == {str(modelo_id): "SDF-9"}
    assert "modelo_destacado_id" not in corpo


@pytest.mark.parametrize(
    "consulta",
    [
        "dia=2026-10-10&semana=2026-W41",
        "dia=10-10-2026",
        "semana=2026-41",
        "fuso_horario=Inexistente/Teste",
        "modelo_dispositivo_id=nao-e-uuid",
        "page=0",
        "page_size=0",
        "page_size=101",
        f"responsavel={'a' * 101}",
        f"sdf_id={'a' * 101}",
        "associados_a_mim=talvez",
    ],
)
async def test_periodo_ou_filtro_invalido_retorna_422_problem_details(api_client, consulta):
    historico = AsyncMock()
    service = FormFactorServiceImpl(*(AsyncMock() for _ in range(7)), historico_repo=historico)
    _usar(service)

    response = await api_client.get(
        f"/api/form-factor/general/projetos/{uuid4()}/historico?{consulta}"
    )

    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/problem+json")
    historico.listar_casos.assert_not_awaited()


@pytest.mark.parametrize(
    "erro,status",
    [
        (ForbiddenException("sem permissão"), 403),
        (NotFoundException("Projeto não encontrado."), 404),
    ],
)
async def test_403_e_404_saem_como_problem_details(api_client, erro, status):
    service = AsyncMock()
    service.historico_projeto.side_effect = erro
    service.resumo_execucoes.side_effect = erro
    _usar(service)

    historico = await api_client.get(
        f"/api/form-factor/general/projetos/{uuid4()}/historico?page=2"
    )
    resumo = await api_client.get(f"/api/form-factor/general/casos/{uuid4()}/execucoes")

    for response in (historico, resumo):
        assert response.status_code == status
        assert response.headers["content-type"].startswith("application/problem+json")


async def test_resumo_devolve_todas_as_execucoes_do_caso(api_client):
    caso_id, modelo_id = uuid4(), uuid4()
    execucao = ExecucaoNaDataResponse(
        execucao_id=uuid4(),
        resultado="FAIL",
        sdf_id="SDF-1",
        origem="SDF",
        data_reportada="2026-10-10T12:00:00",
    )
    service = AsyncMock()
    service.resumo_execucoes.return_value = ResumoExecucoesResponse(
        caso_teste_id=caso_id,
        tc_id="Clock_001",
        responsavel_identificador="ANA-001",
        modelos=[FormFactorModeloResponse(id=modelo_id, nome="SM-S26")],
        datas=[date(2026, 10, 10)],
        resultados={date(2026, 10, 10): {modelo_id: [execucao, execucao]}},
    )
    _usar(service)

    response = await api_client.get(
        f"/api/form-factor/general/casos/{caso_id}/execucoes?fuso_horario=America/Manaus"
    )

    assert response.status_code == 200
    service.resumo_execucoes.assert_awaited_once_with(USUARIO, caso_id, "America/Manaus")
    assert len(response.json()["resultados"]["2026-10-10"][str(modelo_id)]) == 2
