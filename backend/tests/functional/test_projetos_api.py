from unittest.mock import AsyncMock
from uuid import uuid4

from src.api.dependencies import (
    get_caso_teste_service,
    get_importacao_projeto_service,
    get_projeto_service,
    get_usuario_atual,
)
from src.application.schemas.importacao_projeto import ImportarProjetoPlanilhaResponse
from src.application.schemas.projeto import ProjetoResponse
from src.application.services.caso_teste_service import CasoTesteServiceImpl
from src.application.services.projeto_service import ProjetoServiceImpl
from src.application.validators.importacao_projeto import (
    ErroImportacaoPlanilha,
    PlanilhaProjetoInvalida,
)
from src.domain.common.cor_avatar import CorAvatar
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.caso_teste import (
    CasoTeste,
    CategoriaCasoTeste,
    DificuldadeCasoTeste,
    SituacaoCasoTeste,
    StatusCasoTeste,
)
from src.domain.entities.projeto import Projeto, StatusProjeto
from src.domain.entities.time import Time
from src.domain.queries.caso_teste_com_responsavel import CasoTesteComResponsavel
from src.domain.queries.linha_navegacao_board import LinhaNavegacaoBoard
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
    service.listar.assert_awaited_once_with(usuario, 2, 15, False)


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


def _kanban_service(unidade_id, setor_id, cards):
    projeto_repo, time_repo, caso_repo = AsyncMock(), AsyncMock(), AsyncMock()
    projeto = Projeto(unidade_id, uuid4(), "Clock", "9.5")
    projeto_repo.obter_por_id.return_value = projeto
    time_repo.obter_por_id.return_value = Time(unidade_id, setor_id, "Clock", uuid4())
    caso_repo.listar_cards_por_projeto.return_value = tuple(
        CasoTesteComResponsavel(
            CasoTeste(
                unidade_id,
                projeto.id,
                f"Clock_{i:04d}",
                CategoriaCasoTeste.A,
                DificuldadeCasoTeste.LOW,
                uuid4(),
                None,
                SituacaoCasoTeste.NEW,
                status,
                exigir_backup=False,
            ),
            "Afonso Fagundes",
            CorAvatar.LARANJA,
        )
        for i, status in enumerate(cards)
    )
    service = CasoTesteServiceImpl(
        caso_repo, projeto_repo, time_repo, AsyncMock(), AsyncMock(), AsyncMock(), AsyncMock()
    )
    return service, caso_repo, projeto_repo


async def test_obter_kanban_retorna_200_com_totais_de_1000_casos(api_client):
    from src.api.main import app

    unidade_id = uuid4()
    status = list(StatusCasoTeste)
    service, _, _ = _kanban_service(unidade_id, uuid4(), [status[i % 7] for i in range(1000)])
    admin = UsuarioAutenticado(uuid4(), unidade_id, "ADMIN_UNIDADE")
    app.dependency_overrides[get_usuario_atual] = dependency_override(admin)
    app.dependency_overrides[get_caso_teste_service] = dependency_override(service)

    response = await api_client.get(f"/api/projetos/{uuid4()}/kanban")

    assert response.status_code == 200
    corpo = response.json()
    assert corpo["total"] == 1000
    assert [coluna["status"] for coluna in corpo["colunas"]] == [
        "To-Do",
        "InProgress",
        "InReview",
        "InValidation",
        "InFixes",
        "Done",
        "Cancelled",
    ]
    assert sum(coluna["total"] for coluna in corpo["colunas"]) == 1000
    card = corpo["colunas"][0]["casos"][0]
    assert card["responsavel_nome"] == "Afonso Fagundes"
    assert card["responsavel_cor_avatar"] == "laranja"
    assert len(card["destinos"]) == 6


async def test_obter_kanban_fora_do_escopo_retorna_404_e_sem_permissao_403(api_client):
    from src.api.main import app

    unidade_id = uuid4()
    service, caso_repo, projeto_repo = _kanban_service(unidade_id, uuid4(), [StatusCasoTeste.TO_DO])
    gerente = UsuarioAutenticado(
        uuid4(),
        unidade_id,
        "GERENTE",
        permissoes=frozenset({"test_cases.consultar"}),
        setores_gerenciados=(uuid4(),),
    )
    app.dependency_overrides[get_caso_teste_service] = dependency_override(service)
    app.dependency_overrides[get_usuario_atual] = dependency_override(gerente)

    fora = await api_client.get(f"/api/projetos/{uuid4()}/kanban")

    sem_permissao = UsuarioAutenticado(uuid4(), unidade_id, "USUARIO_PADRAO")
    app.dependency_overrides[get_usuario_atual] = dependency_override(sem_permissao)
    proibido = await api_client.get(f"/api/projetos/{uuid4()}/kanban")

    # Projeto inexistente ou de outra unidade: o repositório filtra pela unidade e não acha nada.
    projeto_repo.obter_por_id.return_value = None
    admin = UsuarioAutenticado(uuid4(), unidade_id, "ADMIN_UNIDADE")
    app.dependency_overrides[get_usuario_atual] = dependency_override(admin)
    inexistente = await api_client.get(f"/api/projetos/{uuid4()}/kanban")

    assert fora.status_code == 404
    assert inexistente.status_code == 404
    assert projeto_repo.obter_por_id.await_args.args[0] == unidade_id
    assert proibido.status_code == 403
    caso_repo.listar_cards_por_projeto.assert_not_called()


async def test_listar_navegacao_retorna_arvore_e_nao_cai_na_rota_por_id(api_client):
    from src.api.main import app

    unidade_id, setor_id, time_id = uuid4(), uuid4(), uuid4()
    projeto_repo = AsyncMock()
    projeto_repo.listar_navegacao.return_value = (
        LinhaNavegacaoBoard(
            setor_id,
            "SVP",
            time_id,
            "SDF Automation",
            11,
            uuid4(),
            "Clock 9.5",
            StatusProjeto.TO_DO,
        ),
    )
    service = ProjetoServiceImpl(projeto_repo, AsyncMock(), AsyncMock(), AsyncMock(), AsyncMock())
    dev = UsuarioAutenticado(
        uuid4(),
        unidade_id,
        "USUARIO_PADRAO",
        permissoes=frozenset({"test_cases.consultar"}),
        time_ids=(time_id,),
    )
    app.dependency_overrides[get_usuario_atual] = dependency_override(dev)
    app.dependency_overrides[get_projeto_service] = dependency_override(service)

    response = await api_client.get("/api/projetos/navegacao")

    assert response.status_code == 200
    [setor] = response.json()["setores"]
    assert setor["nome"] == "SVP"
    assert setor["times"][0]["membros"] == 11
    assert setor["times"][0]["projetos"][0] == {
        "id": setor["times"][0]["projetos"][0]["id"],
        "nome": "Clock 9.5",
        "status": "To Do",
    }
    projeto_repo.listar_navegacao.assert_awaited_once_with(unidade_id, (time_id,))
    projeto_repo.obter_por_id.assert_not_called()


async def test_listar_navegacao_sem_times_retorna_arvore_vazia(api_client):
    from src.api.main import app

    projeto_repo = AsyncMock()
    projeto_repo.listar_navegacao.return_value = ()
    service = ProjetoServiceImpl(projeto_repo, AsyncMock(), AsyncMock(), AsyncMock(), AsyncMock())
    kp = UsuarioAutenticado(uuid4(), uuid4(), "KP", permissoes=frozenset({"test_cases.consultar"}))
    app.dependency_overrides[get_usuario_atual] = dependency_override(kp)
    app.dependency_overrides[get_projeto_service] = dependency_override(service)

    response = await api_client.get("/api/projetos/navegacao")

    assert response.status_code == 200
    assert response.json() == {"setores": []}
