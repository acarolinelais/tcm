from unittest.mock import AsyncMock
from uuid import uuid4

from src.api.dependencies import (
    get_form_factor_service,
    get_importacao_sdf_service,
    get_usuario_atual,
)
from src.application.schemas.form_factor import FormFactorResponse
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


async def test_consultar_form_factor_com_filtros(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    projeto_id = uuid4()
    service = AsyncMock()
    service.listar.return_value = FormFactorResponse(
        items=[], page=2, page_size=25, total_count=0, total_pages=0
    )
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_form_factor_service] = dependency_override(service)

    response = await api_client.get(
        f"/api/projetos/{projeto_id}/form-factor?page=2&page_size=25&semana=2026-W12&one_ui=9.5"
    )

    assert response.status_code == 200
    service.listar.assert_awaited_once_with(usuario, projeto_id, 2, 25, "2026-W12", "9.5")


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
    service = FormFactorServiceImpl(projeto_repo, time_repo, resultado_repo)
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
    service = FormFactorServiceImpl(projeto_repo, time_repo, resultado_repo)
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
    service = FormFactorServiceImpl(projeto_repo, time_repo, resultado_repo)
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_form_factor_service] = dependency_override(service)

    response = await api_client.get(f"/api/projetos/{uuid4()}/form-factor")

    assert response.status_code == 404
    projeto_repo.obter_por_id.assert_awaited_once()
    assert projeto_repo.obter_por_id.await_args.args[0] == usuario.unidade_id
    resultado_repo.listar_form_factor_por_projeto.assert_not_awaited()
