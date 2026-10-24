from unittest.mock import AsyncMock
from uuid import uuid4

from src.api.dependencies import (
    get_importacao_projeto_service,
    get_projeto_service,
    get_usuario_atual,
)
from src.application.schemas.importacao_projeto import ImportarProjetoPlanilhaResponse
from src.application.schemas.projeto import ProjetoResponse
from src.application.services.projeto_service import ProjetoServiceImpl
from src.application.validators.importacao_projeto import (
    ErroImportacaoPlanilha,
    PlanilhaProjetoInvalida,
)
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.projeto import Projeto
from src.domain.entities.time import Time
from tests.functional.conftest import dependency_override


def _projeto_response(unidade_id, time_id):
    return ProjetoResponse(
        id=uuid4(),
        unidade_id=unidade_id,
        time_id=time_id,
        app="Clock",
        one_ui="9.5",
        nome="Clock 9.5",
        status="Created",
        ativo=True,
        created_at=None,
        updated_at=None,
    )


async def test_criar_projeto_retorna_201_location_e_payload(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    time_id = uuid4()
    service = AsyncMock()
    service.criar.return_value = _projeto_response(usuario.unidade_id, time_id)
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_projeto_service] = dependency_override(service)

    response = await api_client.post(
        "/api/projetos",
        json={"time_id": str(time_id), "app": "Clock", "one_ui": "9.5", "modelos_ids": []},
    )

    assert response.status_code == 201
    assert response.headers["location"] == f"/api/projetos/{response.json()['id']}"
    service.criar.assert_awaited_once()


async def test_listar_projetos_retorna_paginacao(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    service = AsyncMock()
    service.listar.return_value = PagedResult([], 2, 15, 0)
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_projeto_service] = dependency_override(service)

    response = await api_client.get("/api/projetos?page=2&page_size=15")

    assert response.status_code == 200
    assert response.json()["page"] == 2
    service.listar.assert_awaited_once_with(usuario, 2, 15)


async def test_consultar_projeto_retorna_200(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    projeto = _projeto_response(usuario.unidade_id, uuid4())
    service = AsyncMock()
    service.obter.return_value = projeto
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_projeto_service] = dependency_override(service)

    response = await api_client.get(f"/api/projetos/{projeto.id}")

    assert response.status_code == 200
    assert response.json()["nome"] == "Clock 9.5"


async def test_importar_planilha_inicial_envia_formulario_e_arquivo(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    time_id, modelo_id = uuid4(), uuid4()
    projeto = _projeto_response(usuario.unidade_id, time_id)
    service = AsyncMock()
    service.importar.return_value = ImportarProjetoPlanilhaResponse(
        projeto=projeto, quantidade_casos=4
    )
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_importacao_projeto_service] = dependency_override(service)

    response = await api_client.post(
        "/api/projetos/importar",
        data={"time_id": str(time_id), "modelos_ids": str(modelo_id)},
        files={
            "arquivo": (
                "projeto.xlsx",
                b"planilha",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
    )

    assert response.status_code == 201
    assert response.json()["quantidade_casos"] == 4
    chamada = service.importar.await_args
    assert chamada.args[0] == usuario
    assert chamada.args[1].modelos_ids == [modelo_id]
    assert chamada.args[2] == b"planilha"


async def test_planilha_inicial_invalida_retorna_problem_details_422(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    service = AsyncMock()
    service.importar.side_effect = PlanilhaProjetoInvalida(
        (
            ErroImportacaoPlanilha(
                5,
                "tc id",
                "TC ID duplicado na planilha.",
                "tc_id_duplicado",
                "TC ID",
                "Clock_001",
                {"primeira_linha": 2},
            ),
            ErroImportacaoPlanilha(
                None, "planilha", "A planilha precisa conter ao menos um Test Case.", "sem_casos"
            ),
        ),
        total_linhas=120,
    )
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_importacao_projeto_service] = dependency_override(service)

    response = await api_client.post(
        "/api/projetos/importar",
        data={"time_id": str(uuid4())},
        files={"arquivo": ("projeto.xlsx", b"invalid")},
    )

    assert response.status_code == 422
    corpo = response.json()
    assert corpo["total_linhas"] == 120
    assert corpo["errors"] == [
        {
            "campo": "linha.5.tc id",
            "mensagem": "TC ID duplicado na planilha.",
            "codigo": "tc_id_duplicado",
            "linha": 5,
            "coluna": "TC ID",
            "valor": "Clock_001",
            "parametros": {"primeira_linha": 2},
        },
        {
            "campo": "planilha",
            "mensagem": "A planilha precisa conter ao menos um Test Case.",
            "codigo": "sem_casos",
        },
    ]


async def test_gerente_nao_consulta_projeto_de_setor_fora_do_escopo(api_client):
    from src.api.main import app

    unidade_id, usuario_id, setor_id, setor_permitido, time_id = (uuid4() for _ in range(5))
    gerente = UsuarioAutenticado(
        usuario_id,
        unidade_id,
        "GERENTE",
        permissoes=frozenset({"projetos.consultar"}),
        setores_gerenciados=(setor_permitido,),
    )
    projeto_repo, time_repo = AsyncMock(), AsyncMock()
    projeto_repo.obter_por_id.return_value = Projeto(unidade_id, time_id, "Clock", "9.5")
    time_repo.obter_por_id.return_value = Time(unidade_id, setor_id, "Fora do escopo", usuario_id)
    service = ProjetoServiceImpl(projeto_repo, time_repo, AsyncMock(), AsyncMock(), AsyncMock())
    app.dependency_overrides[get_usuario_atual] = dependency_override(gerente)
    app.dependency_overrides[get_projeto_service] = dependency_override(service)

    response = await api_client.get(f"/api/projetos/{uuid4()}")

    assert response.status_code == 404
    assert projeto_repo.obter_por_id.await_args.args[0] == unidade_id
    time_repo.obter_por_id.assert_awaited_once()


async def test_projeto_de_outra_unidade_nao_e_encontrado(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    projeto_repo, time_repo = AsyncMock(), AsyncMock()
    projeto_repo.obter_por_id.return_value = None
    service = ProjetoServiceImpl(projeto_repo, time_repo, AsyncMock(), AsyncMock(), AsyncMock())
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_projeto_service] = dependency_override(service)

    response = await api_client.get(f"/api/projetos/{uuid4()}")

    assert response.status_code == 404
    projeto_repo.obter_por_id.assert_awaited_once()
    assert projeto_repo.obter_por_id.await_args.args[0] == usuario.unidade_id
