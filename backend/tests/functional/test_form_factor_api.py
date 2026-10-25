from unittest.mock import AsyncMock
from uuid import uuid4

from src.api.dependencies import (
    get_form_factor_service,
    get_importacao_sdf_service,
    get_usuario_atual,
)
from src.application.schemas.form_factor import (
    CriarRodadaFormFactorRequest,
    FormFactorExecucaoResponse,
    FormFactorLinhaResponse,
    FormFactorModeloResponse,
    FormFactorResponse,
    FormFactorResultadosResponse,
)
from src.application.schemas.importacao_sdf import ImportarRelatorioSdfResponse
from src.application.services.form_factor_service import FormFactorServiceImpl
from src.application.validators.importacao_projeto import (
    ErroImportacaoPlanilha,
)
from src.application.validators.relatorio_sdf import RelatorioSdfInvalido
from src.domain.common.exceptions import ForbiddenException
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.projeto import Projeto
from src.domain.entities.time import Time
from tests.functional.conftest import dependency_override


async def test_importar_relatorio_sdf_retorna_201(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    projeto_id = uuid4()
    service = AsyncMock()
    service.importar.return_value = ImportarRelatorioSdfResponse(
        importacao_id=uuid4(), quantidade_execucoes=2, quantidade_resultados=8
    )
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_importacao_sdf_service] = dependency_override(service)

    response = await api_client.post(
        f"/api/projetos/{projeto_id}/relatorios-sdf",
        files={"arquivo": ("resultado.xlsx", b"sdf-report")},
    )

    assert response.status_code == 201
    assert response.json()["quantidade_resultados"] == 8
    service.importar.assert_awaited_once_with(usuario, projeto_id, b"sdf-report")


async def test_relatorio_sdf_invalido_retorna_problem_details_422(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    service = AsyncMock()
    service.importar.side_effect = RelatorioSdfInvalido(
        (ErroImportacaoPlanilha(2, "tc id", "TC ID inválido."),)
    )
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_importacao_sdf_service] = dependency_override(service)

    response = await api_client.post(
        f"/api/projetos/{uuid4()}/relatorios-sdf",
        files={"arquivo": ("resultado.xlsx", b"invalid")},
    )

    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json()["errors"][0] == {
        "campo": "linha.2.tc id",
        "mensagem": "TC ID inválido.",
    }


async def test_sem_permissao_de_importacao_retorna_403(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "USUARIO_PADRAO")
    service = AsyncMock()
    service.importar.side_effect = ForbiddenException("Sem permissão.")
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_importacao_sdf_service] = dependency_override(service)

    response = await api_client.post(
        f"/api/projetos/{uuid4()}/relatorios-sdf",
        files={"arquivo": ("resultado.xlsx", b"valid")},
    )

    assert response.status_code == 403


async def test_consultar_form_factor_filtrando_por_responsavel(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    projeto_id, responsavel_id, caso_id, modelo_id = (uuid4() for _ in range(4))
    service = AsyncMock()
    service.listar.return_value = FormFactorResponse(
        modelos=[FormFactorModeloResponse(id=modelo_id, nome="SAMSUNG S25")],
        items=[
            FormFactorLinhaResponse(
                caso_teste_id=caso_id,
                tc_id="TC-001",
                responsavel_id=responsavel_id,
                sdf_id=None,
                data_reportada=None,
                resultados={modelo_id: "Pass"},
            )
        ],
        page=2,
        page_size=25,
        total_count=26,
        total_pages=2,
    )
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_form_factor_service] = dependency_override(service)

    response = await api_client.get(
        f"/api/projetos/{projeto_id}/form-factor"
        f"?page=2&page_size=25&semana=2026-W12&responsavel_id={responsavel_id}"
    )

    assert response.status_code == 200
    service.listar.assert_awaited_once_with(
        usuario, projeto_id, 2, 25, "2026-W12", responsavel_id, None, None, None, None
    )
    body = response.json()
    assert body["modelos"] == [{"id": str(modelo_id), "nome": "SAMSUNG S25"}]
    assert body["items"][0]["resultados"] == {str(modelo_id): "Pass"}
    assert body["items"][0]["sdf_id"] is None


async def test_consultar_historico_form_factor_com_filtros(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    projeto_id, responsavel_id, caso_id, execucao_id, modelo_id = (uuid4() for _ in range(5))
    service = AsyncMock()
    service.listar_resultados.return_value = FormFactorResultadosResponse(
        modelos=[FormFactorModeloResponse(id=modelo_id, nome="S25")],
        items=[
            FormFactorExecucaoResponse(
                execucao_id=execucao_id,
                caso_teste_id=caso_id,
                tc_id="TC-001",
                responsavel_id=responsavel_id,
                sdf_id=None,
                data_reportada="2026-03-23T10:00:00Z",
                origem="MANUAL",
                resultados={modelo_id: "PASS"},
            )
        ],
        page=1,
        page_size=20,
        total_count=1,
        total_pages=1,
    )
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_form_factor_service] = dependency_override(service)

    response = await api_client.get(
        f"/api/projetos/{projeto_id}/form-factor/results?page=1&page_size=20"
        f"&semana=2026-W13&responsavel_id={responsavel_id}&tc_id=TC-001"
        f"&modelo_dispositivo_id={modelo_id}&resultado=PASS&origem=MANUAL"
    )

    assert response.status_code == 200
    service.listar_resultados.assert_awaited_once_with(
        usuario,
        projeto_id,
        1,
        20,
        "2026-W13",
        responsavel_id,
        "TC-001",
        None,
        modelo_id,
        "PASS",
        "MANUAL",
    )
    assert response.json()["items"][0]["origem"] == "MANUAL"
    assert response.json()["items"][0]["sdf_id"] is None


async def test_filtros_invalidos_do_historico_retorna_422(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    service = AsyncMock()
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_form_factor_service] = dependency_override(service)

    response = await api_client.get(
        f"/api/projetos/{uuid4()}/form-factor/results?semana=2026-13&modelo_dispositivo_id=bad"
    )

    assert response.status_code == 422
    service.listar_resultados.assert_not_awaited()


async def test_criar_rodada_manual_retorna_201(api_client):
    from datetime import UTC, datetime

    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    projeto_id, caso_id, execucao_id, modelo_id = (uuid4() for _ in range(4))
    service = AsyncMock()
    service.criar_rodada_manual.return_value = FormFactorExecucaoResponse(
        execucao_id=execucao_id,
        caso_teste_id=caso_id,
        tc_id="TC-001",
        responsavel_id=usuario.id,
        sdf_id=None,
        data_reportada=datetime.now(UTC),
        origem="MANUAL",
        resultados={modelo_id: "PASS"},
    )
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_form_factor_service] = dependency_override(service)

    response = await api_client.post(
        f"/api/projetos/{projeto_id}/form-factor/results",
        json={"caso_teste_id": str(caso_id), "resultados": {str(modelo_id): "PASS"}},
    )

    assert response.status_code == 201
    assert response.json()["origem"] == "MANUAL"
    service.criar_rodada_manual.assert_awaited_once_with(
        usuario,
        projeto_id,
        CriarRodadaFormFactorRequest(caso_teste_id=caso_id, resultados={modelo_id: "PASS"}),
    )


async def test_criar_rodada_manual_com_resultado_invalido_retorna_422(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    service = AsyncMock()
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_form_factor_service] = dependency_override(service)

    response = await api_client.post(
        f"/api/projetos/{uuid4()}/form-factor/results",
        json={"caso_teste_id": str(uuid4()), "resultados": {str(uuid4()): "BLOCKED"}},
    )

    assert response.status_code == 422
    service.criar_rodada_manual.assert_not_awaited()


async def test_criar_rodada_manual_sem_resultados_retorna_422(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    service = AsyncMock()
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_form_factor_service] = dependency_override(service)

    response = await api_client.post(
        f"/api/projetos/{uuid4()}/form-factor/results",
        json={"caso_teste_id": str(uuid4()), "resultados": {}},
    )

    assert response.status_code == 422
    service.criar_rodada_manual.assert_not_awaited()


async def test_responsavel_id_invalido_retorna_422(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    service = AsyncMock()
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_form_factor_service] = dependency_override(service)

    response = await api_client.get(f"/api/projetos/{uuid4()}/form-factor?responsavel_id=ana")

    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/problem+json")
    service.listar.assert_not_awaited()


async def test_filtro_de_semana_com_formato_invalido_retorna_422(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    service = AsyncMock()
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_form_factor_service] = dependency_override(service)

    response = await api_client.get(f"/api/projetos/{uuid4()}/form-factor?semana=2026-12")

    assert response.status_code == 422
    service.listar.assert_not_awaited()


async def test_filtro_de_semana_iso_inexistente_retorna_422(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    projeto_repo, time_repo, resultado_repo = (AsyncMock() for _ in range(3))
    projeto = Projeto(usuario.unidade_id, uuid4(), "Clock", "9.5")
    projeto_repo.obter_por_id.return_value = projeto
    time_repo.obter_por_id.return_value = Time(usuario.unidade_id, uuid4(), "QA", usuario.id)
    service = FormFactorServiceImpl(
        projeto_repo, time_repo, resultado_repo, AsyncMock(), AsyncMock(), AsyncMock(), AsyncMock()
    )
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_form_factor_service] = dependency_override(service)

    response = await api_client.get(f"/api/projetos/{projeto.id}/form-factor?semana=2026-W54")

    assert response.status_code == 422
    assert "Semana ISO inválida" in response.json()["detail"]
    resultado_repo.listar_form_factor_por_projeto.assert_not_awaited()


async def test_gerente_nao_consulta_form_factor_de_setor_fora_do_escopo(api_client):
    from src.api.main import app

    unidade_id, usuario_id, time_id, setor_id = (uuid4() for _ in range(4))
    gerente = UsuarioAutenticado(
        usuario_id,
        unidade_id,
        "GERENTE",
        permissoes=frozenset({"form_factor.consultar"}),
        setores_gerenciados=(uuid4(),),
    )
    projeto_repo, time_repo, resultado_repo = (AsyncMock() for _ in range(3))
    projeto_repo.obter_por_id.return_value = Projeto(unidade_id, time_id, "Clock", "9.5")
    time_repo.obter_por_id.return_value = Time(unidade_id, setor_id, "Outro setor", usuario_id)
    service = FormFactorServiceImpl(
        projeto_repo, time_repo, resultado_repo, AsyncMock(), AsyncMock(), AsyncMock(), AsyncMock()
    )
    app.dependency_overrides[get_usuario_atual] = dependency_override(gerente)
    app.dependency_overrides[get_form_factor_service] = dependency_override(service)

    response = await api_client.get(f"/api/projetos/{uuid4()}/form-factor")

    assert response.status_code == 404
    resultado_repo.listar_form_factor_por_projeto.assert_not_awaited()


async def test_form_factor_de_projeto_de_outra_unidade_nao_e_consultado(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    projeto_repo, time_repo, resultado_repo = (AsyncMock() for _ in range(3))
    projeto_repo.obter_por_id.return_value = None
    service = FormFactorServiceImpl(
        projeto_repo, time_repo, resultado_repo, AsyncMock(), AsyncMock(), AsyncMock(), AsyncMock()
    )
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_form_factor_service] = dependency_override(service)

    response = await api_client.get(f"/api/projetos/{uuid4()}/form-factor")

    assert response.status_code == 404
    projeto_repo.obter_por_id.assert_awaited_once()
    assert projeto_repo.obter_por_id.await_args.args[0] == usuario.unidade_id
    resultado_repo.listar_form_factor_por_projeto.assert_not_awaited()
