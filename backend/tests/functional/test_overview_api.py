from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

from src.api.dependencies import get_overview_service, get_usuario_atual
from src.application.services.overview_service import OverviewServiceImpl
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.queries.resumo_overview import (
    Andamento,
    ProjetoOverview,
    ProjetoPessoal,
    ResumoOverview,
    ResumoPessoal,
    ResumoTime,
)
from tests.functional.conftest import dependency_override

# Spec 039: GET /api/overview.


def _usar(usuario, repo, projeto_repo=None, time_repo=None):
    from src.api.main import app

    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    service = OverviewServiceImpl(repo, projeto_repo or AsyncMock(), time_repo or AsyncMock())
    app.dependency_overrides[get_overview_service] = dependency_override(service)


async def test_overview_retorna_as_contagens_do_gerente(api_client):
    usuario = UsuarioAutenticado(uuid4(), uuid4(), "GERENTE", time_ids=(uuid4(),))
    repo = AsyncMock()
    repo.resumir.return_value = ResumoOverview(10, 4, 3, 3, 2)
    _usar(usuario, repo)

    response = await api_client.get("/api/overview", params={"fuso_horario": "America/Sao_Paulo"})

    assert response.status_code == 200
    corpo = response.json()
    assert {chave: corpo[chave] for chave in ("total", "concluidos", "em_andamento")} == {
        "total": 10,
        "concluidos": 4,
        "em_andamento": 3,
    }
    assert len(corpo["desempenho"]) == 6
    assert repo.resumir.await_args.args[0] == usuario.unidade_id


async def test_overview_fuso_invalido_retorna_422(api_client):
    _usar(UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE"), AsyncMock())

    response = await api_client.get("/api/overview", params={"fuso_horario": "Lua/Crateras"})

    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/problem+json")


async def test_overview_sem_token_retorna_401(api_client):
    response = await api_client.get("/api/overview")

    assert response.status_code == 401


# Spec 063: GET /api/overview/time.


async def test_overview_time_retorna_os_graficos_do_kp(api_client):
    usuario = UsuarioAutenticado(uuid4(), uuid4(), "KP", time_ids=(uuid4(),))
    repo = AsyncMock()
    projeto_id = uuid4()
    repo.resumir_time.return_value = ResumoTime(
        projetos=[ProjetoOverview(projeto_id, "Clock 9.5", "Clock")],
        done_por_projeto={projeto_id: (4, 9)},
        em_andamento_por_projeto={projeto_id: 2},
    )
    _usar(usuario, repo)

    response = await api_client.get("/api/overview/time", params={"fuso_horario": "UTC"})

    assert response.status_code == 200
    corpo = response.json()
    assert corpo["projetos"] == [{"id": str(projeto_id), "nome": "Clock 9.5", "app": "Clock"}]
    assert corpo["done_por_projeto"] == [
        {
            "projeto_id": str(projeto_id),
            "projeto": "Clock 9.5",
            "concluidos": 4,
            "total": 9,
            "em_andamento": 2,
        }
    ]
    assert len(corpo["concluidos_por_semana"]) == 12


async def test_overview_time_kp_so_consulta_os_proprios_times(api_client):
    # CA-11: o filtro por time é do repositório (integração); aqui, o escopo que chega a ele.
    usuario = UsuarioAutenticado(uuid4(), uuid4(), "KP", time_ids=(uuid4(),))
    repo = AsyncMock()
    repo.resumir_time.return_value = ResumoTime()
    _usar(usuario, repo)

    await api_client.get("/api/overview/time")

    unidade_id, escopo = repo.resumir_time.await_args.args[:2]
    assert (unidade_id, escopo.time_ids) == (usuario.unidade_id, usuario.time_ids)


async def test_overview_time_fuso_invalido_retorna_422(api_client):
    _usar(UsuarioAutenticado(uuid4(), uuid4(), "KP", time_ids=(uuid4(),)), AsyncMock())

    response = await api_client.get("/api/overview/time", params={"fuso_horario": "Lua/Crateras"})

    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/problem+json")


async def test_overview_time_sem_token_retorna_401(api_client):
    response = await api_client.get("/api/overview/time")

    assert response.status_code == 401


# Spec 063: GET /api/overview/projetos/{projeto_id} e GET /api/overview/pessoal.


def _projeto_do_time(time_id):
    projeto_repo, time_repo = AsyncMock(), AsyncMock()
    projeto_repo.obter_por_id.return_value = SimpleNamespace(
        id=uuid4(), time_id=time_id, ativo=True
    )
    time_repo.obter_por_id.return_value = SimpleNamespace(id=time_id, setor_id=uuid4())
    return projeto_repo, time_repo


async def test_overview_projeto_retorna_burndown_e_pass_rate_nulo_sem_rodada(api_client):
    time_id = uuid4()
    repo = AsyncMock()
    repo.burndown_executado.return_value = [3] * 30
    repo.pass_rate_ultima_rodada.return_value = None
    _usar(
        UsuarioAutenticado(uuid4(), uuid4(), "KP", time_ids=(time_id,)),
        repo,
        *_projeto_do_time(time_id),
    )

    response = await api_client.get(f"/api/overview/projetos/{uuid4()}")

    assert response.status_code == 200
    corpo = response.json()
    assert len(corpo["burndown"]) == 30
    assert corpo["burndown"][0]["executado"] == 3
    assert corpo["pass_rate"] is None


async def test_overview_projeto_de_outro_time_retorna_404(api_client):
    repo = AsyncMock()
    _usar(
        UsuarioAutenticado(uuid4(), uuid4(), "KP", time_ids=(uuid4(),)),
        repo,
        *_projeto_do_time(uuid4()),
    )

    response = await api_client.get(f"/api/overview/projetos/{uuid4()}")

    assert response.status_code == 404
    assert response.headers["content-type"].startswith("application/problem+json")
    repo.burndown_executado.assert_not_awaited()


async def test_overview_pessoal_retorna_os_graficos_do_dev(api_client):
    usuario = UsuarioAutenticado(uuid4(), uuid4(), "USUARIO_PADRAO")
    repo = AsyncMock()
    projeto_id = uuid4()
    repo.resumir_pessoal.return_value = ResumoPessoal(
        5, 12, {"Low": 2}, {}, [ProjetoPessoal(projeto_id, "Clock 9.5", "Clock", 5, 4, 12)]
    )
    _usar(usuario, repo)

    response = await api_client.get("/api/overview/pessoal")

    assert response.status_code == 200
    corpo = response.json()
    assert (corpo["concluidos"], corpo["atribuidos"]) == (5, 12)
    assert corpo["por_dificuldade"] == {"Low": 2, "Medium": 0, "High": 0}
    assert (len(corpo["entregas_por_dia"]), len(corpo["entregas_por_semana"])) == (30, 12)
    assert repo.resumir_pessoal.await_args.args[1] == usuario.id
    assert corpo["projetos"] == [
        {
            "projeto_id": str(projeto_id),
            "projeto": "Clock 9.5",
            "app": "Clock",
            "concluidos": 5,
            "em_andamento": 4,
            "atribuidos": 12,
        }
    ]


async def test_overview_pessoal_sem_token_retorna_401(api_client):
    response = await api_client.get("/api/overview/pessoal")

    assert response.status_code == 401


# Spec 064: o gerente recebe os campos novos com o escopo dele (CA-11).


async def test_overview_time_gerente_so_consulta_o_escopo_e_recebe_os_campos_novos(api_client):
    time_id = uuid4()
    usuario = UsuarioAutenticado(uuid4(), uuid4(), "GERENTE", time_ids=(time_id,))
    repo = AsyncMock()
    projeto_id = uuid4()
    repo.resumir_time.return_value = ResumoTime(
        projetos=[ProjetoOverview(projeto_id, "Clock 9.5", "Clock")],
        andamento_por_time=[Andamento(time_id, "QA", 1, 2, 3)],
        pass_rate_por_projeto={projeto_id: (8, 10)},
    )
    _usar(usuario, repo)

    response = await api_client.get("/api/overview/time")

    assert response.status_code == 200
    corpo = response.json()
    assert corpo["andamento_por_time"] == [
        {"id": str(time_id), "nome": "QA", "a_fazer": 1, "em_andamento": 2, "concluidos": 3}
    ]
    assert corpo["pass_rate_por_projeto"] == [
        {"projeto_id": str(projeto_id), "projeto": "Clock 9.5", "aprovados": 8, "total": 10}
    ]
    assert corpo["em_correcao_por_projeto"] == [] and corpo["andamento_por_setor"] == []
    unidade_id, escopo = repo.resumir_time.await_args.args[:2]
    assert (unidade_id, escopo.time_ids) == (usuario.unidade_id, usuario.times_no_escopo)
