from datetime import UTC, date, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4
from zoneinfo import ZoneInfo

import pytest
from src.application.services.overview_service import OverviewServiceImpl, linha_planejada
from src.domain.common.exceptions import InvalidInputException, NotFoundException
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.queries.resumo_overview import (
    Andamento,
    ConcluidosDev,
    EscopoOverview,
    PassRate,
    PassRateModelo,
    ProjetoOverview,
    ProjetoPessoal,
    ResumoOverview,
    ResumoPessoal,
    ResumoTime,
)

AGORA = datetime(2026, 2, 10, 12, tzinfo=UTC)


@pytest.fixture
def repo():
    repo = AsyncMock()
    repo.resumir.return_value = ResumoOverview(10, 4, 3, 3, 2, {"2025-12": 2, "2026-02": 1})
    return repo


def _service(repo, projeto_repo=None, time_repo=None):
    return OverviewServiceImpl(
        repo, projeto_repo or AsyncMock(), time_repo or AsyncMock(), agora=lambda: AGORA
    )


def _usuario(perfil, **kwargs):
    return UsuarioAutenticado(uuid4(), uuid4(), perfil, **kwargs)


@pytest.mark.asyncio
async def test_obter_devolve_contagens_e_seis_meses_do_mais_antigo_ao_atual(repo):
    resposta = await _service(repo).obter(_usuario("ADMIN_UNIDADE"), "UTC")

    assert (resposta.total, resposta.concluidos, resposta.em_andamento) == (10, 4, 3)
    assert (resposta.a_fazer, resposta.atribuidos) == (3, 2)
    assert [(p.mes, p.concluidos) for p in resposta.desempenho] == [
        ("2025-09", 0),
        ("2025-10", 0),
        ("2025-11", 0),
        ("2025-12", 2),
        ("2026-01", 0),
        ("2026-02", 1),
    ]
    desde = repo.resumir.call_args.args[3]
    assert desde == datetime(2025, 9, 1, tzinfo=UTC)


@pytest.mark.asyncio
async def test_obter_conta_os_meses_no_fuso_pedido(repo):
    service = OverviewServiceImpl(
        repo, AsyncMock(), AsyncMock(), agora=lambda: datetime(2026, 3, 1, 2, tzinfo=UTC)
    )

    resposta = await service.obter(_usuario("ADMIN_UNIDADE"), "America/Sao_Paulo")

    # 1º de março às 2h UTC ainda é fevereiro em São Paulo.
    assert resposta.desempenho[-1].mes == "2026-02"
    fuso = ZoneInfo("America/Sao_Paulo")
    desde_esperado = datetime(2025, 9, 1, tzinfo=fuso)
    assert repo.resumir.call_args.args[3:] == (desde_esperado, "America/Sao_Paulo")


@pytest.mark.asyncio
async def test_obter_monta_o_escopo_de_cada_perfil(repo):
    time_a, time_b, time_c = uuid4(), uuid4(), uuid4()
    gerente = _usuario("GERENTE", time_ids=(time_a,), times_gerenciados=(time_b,))
    kp = _usuario("KP", time_ids=(time_c,))
    dev = _usuario("USUARIO_PADRAO", time_ids=(time_c,))
    service = _service(repo)

    escopos = []
    for usuario in (_usuario("ADMIN_UNIDADE"), gerente, kp, dev):
        await service.obter(usuario, "UTC")
        escopos.append(repo.resumir.call_args.args[1])

    assert escopos == [
        EscopoOverview(),
        EscopoOverview(time_ids=(time_b, time_a)),
        EscopoOverview(time_ids=(time_c,)),
        EscopoOverview(pessoa_id=dev.id),
    ]


@pytest.mark.asyncio
async def test_falha_kp_sem_time_devolve_zerado_sem_consultar(repo):
    resposta = await _service(repo).obter(_usuario("KP"), "UTC")

    assert resposta.total == 0
    assert [p.concluidos for p in resposta.desempenho] == [0] * 6
    repo.resumir.assert_not_called()


@pytest.mark.asyncio
async def test_falha_fuso_invalido(repo):
    with pytest.raises(InvalidInputException):
        await _service(repo).obter(_usuario("ADMIN_UNIDADE"), "Lua/Crateras")

    repo.resumir.assert_not_called()


# Spec 063: GET /api/overview/time. AGORA é terça, 10/02/2026.


def _resumo_time(projeto_id):
    return ResumoTime(
        projetos=[ProjetoOverview(projeto_id, "Clock 9.5", "Clock")],
        criados_por_projeto={projeto_id: 15},
        concluidos_por_dev=[ConcluidosDev(uuid4(), "Ana", 3)],
        concluidos_por_semana={"2026-02-02": 2},
        done_por_projeto={projeto_id: (4, 9)},
    )


@pytest.mark.asyncio
async def test_obter_time_monta_doze_semanas_e_a_media_de_criacao_por_dia(repo):
    projeto_id = uuid4()
    repo.resumir_time.return_value = _resumo_time(projeto_id)
    kp = _usuario("KP", time_ids=(uuid4(),))

    resposta = await _service(repo).obter_time(kp, "UTC")

    assert resposta.criacao_por_dia[0].media == 0.5
    assert [(d.concluidos, d.total) for d in resposta.done_por_projeto] == [(4, 9)]
    semanas = [(s.semana, s.concluidos) for s in resposta.concluidos_por_semana]
    assert len(semanas) == 12
    assert semanas[0] == ("2025-11-24", 0)
    assert semanas[-2:] == [("2026-02-02", 2), ("2026-02-09", 0)]
    unidade_id, escopo, desde_dia, desde_semana, fuso = repo.resumir_time.call_args.args
    assert (unidade_id, escopo) == (kp.unidade_id, EscopoOverview(time_ids=kp.time_ids))
    # UTC sem fuso, como `casos_teste.created_at`.
    assert desde_dia == datetime(2026, 1, 12)
    assert desde_semana == datetime(2025, 11, 24, tzinfo=ZoneInfo("UTC"))
    assert fuso == "UTC"


@pytest.mark.asyncio
async def test_obter_time_projeto_sem_casos_aparece_com_zero(repo):
    projeto_id = uuid4()
    repo.resumir_time.return_value = ResumoTime(
        projetos=[ProjetoOverview(projeto_id, "Alarm", "Alarm")]
    )

    resposta = await _service(repo).obter_time(_usuario("KP", time_ids=(uuid4(),)), "UTC")

    assert resposta.criacao_por_dia[0].media == 0
    assert (resposta.done_por_projeto[0].concluidos, resposta.done_por_projeto[0].total) == (0, 0)


@pytest.mark.asyncio
@pytest.mark.parametrize("usuario", [_usuario("USUARIO_PADRAO"), _usuario("KP")])
async def test_falha_obter_time_dev_ou_kp_sem_time_nao_consulta(repo, usuario):
    resposta = await _service(repo).obter_time(usuario, "UTC")

    repo.resumir_time.assert_not_awaited()
    assert resposta.projetos == [] and resposta.concluidos_por_dev == []
    assert [s.concluidos for s in resposta.concluidos_por_semana] == [0] * 12


@pytest.mark.asyncio
async def test_falha_obter_time_fuso_invalido(repo):
    with pytest.raises(InvalidInputException):
        await _service(repo).obter_time(_usuario("KP", time_ids=(uuid4(),)), "Lua/Crateras")


# Spec 063: burndown e Pass Rate do projeto escolhido, e a visão pessoal.


def test_linha_planejada_cai_dois_por_dia_util_e_para_no_fim_de_semana():
    # Segunda 02/02/2026 até a segunda seguinte.
    dias = [date(2026, 2, 2) + timedelta(days=i) for i in range(8)]

    assert linha_planejada(dias, 10) == [10, 8, 6, 4, 2, 2, 2, 0]


def test_linha_planejada_nao_fica_negativa():
    dias = [date(2026, 2, 2) + timedelta(days=i) for i in range(4)]

    assert linha_planejada(dias, 3) == [3, 1, 0, 0]


def _projeto_no_time(ativo=True):
    time_ = SimpleNamespace(id=uuid4(), setor_id=uuid4())
    projeto = SimpleNamespace(id=uuid4(), time_id=time_.id, ativo=ativo)
    projeto_repo, time_repo = AsyncMock(), AsyncMock()
    projeto_repo.obter_por_id.return_value = projeto
    time_repo.obter_por_id.return_value = time_
    return projeto, time_, projeto_repo, time_repo


@pytest.mark.asyncio
async def test_obter_projeto_monta_o_burndown_de_30_dias_e_o_pass_rate(repo):
    projeto, time_, projeto_repo, time_repo = _projeto_no_time()
    repo.burndown_executado.return_value = [20] * 29 + [15]
    modelo = PassRateModelo(uuid4(), "SAMSUNG S26", 3, 4)
    repo.pass_rate_ultima_rodada.return_value = PassRate(AGORA, [modelo])
    kp = _usuario("KP", time_ids=(time_.id,))

    resposta = await _service(repo, projeto_repo, time_repo).obter_projeto(kp, projeto.id, "UTC")

    assert len(resposta.burndown) == 30
    primeiro, ultimo = resposta.burndown[0], resposta.burndown[-1]
    assert (primeiro.dia, primeiro.planejado, primeiro.executado) == ("2026-01-12", 20, 20)
    assert (ultimo.dia, ultimo.executado) == ("2026-02-10", 15)
    # 12/01 é segunda: 21 dias úteis depois dele, até 10/02, levam o planejado a 0.
    assert ultimo.planejado == 0
    _, projeto_id, fins = repo.burndown_executado.call_args.args
    assert (projeto_id, fins[0], fins[-1]) == (
        projeto.id,
        datetime(2026, 1, 13, tzinfo=ZoneInfo("UTC")),
        datetime(2026, 2, 11, tzinfo=ZoneInfo("UTC")),
    )
    assert [(m.modelo, m.aprovados, m.total) for m in resposta.pass_rate.modelos] == [
        ("SAMSUNG S26", 3, 4)
    ]


@pytest.mark.asyncio
async def test_obter_projeto_sem_rodada_devolve_pass_rate_nulo(repo):
    projeto, time_, projeto_repo, time_repo = _projeto_no_time()
    repo.burndown_executado.return_value = [0] * 30
    repo.pass_rate_ultima_rodada.return_value = None

    resposta = await _service(repo, projeto_repo, time_repo).obter_projeto(
        _usuario("KP", time_ids=(time_.id,)), projeto.id, "UTC"
    )

    assert resposta.pass_rate is None


@pytest.mark.asyncio
@pytest.mark.parametrize("caso", ["inexistente", "inativo", "outro_time"])
async def test_falha_obter_projeto_fora_do_escopo_e_404(repo, caso):
    projeto, time_, projeto_repo, time_repo = _projeto_no_time(ativo=caso != "inativo")
    if caso == "inexistente":
        projeto_repo.obter_por_id.return_value = None
    time_ids = (uuid4(),) if caso == "outro_time" else (time_.id,)

    with pytest.raises(NotFoundException):
        await _service(repo, projeto_repo, time_repo).obter_projeto(
            _usuario("KP", time_ids=time_ids), projeto.id, "UTC"
        )
    repo.burndown_executado.assert_not_awaited()


@pytest.mark.asyncio
async def test_obter_pessoal_preenche_dificuldades_dias_e_semanas(repo):
    repo.resumir_pessoal.return_value = ResumoPessoal(
        concluidos=5,
        atribuidos=12,
        por_dificuldade={"Low": 2, "High": 1},
        concluidos_por_dia={"2026-02-03": 2, "2026-02-04": 1, "2026-02-10": 1},
    )
    dev = _usuario("USUARIO_PADRAO")

    resposta = await _service(repo).obter_pessoal(dev, "UTC")

    assert (resposta.concluidos, resposta.atribuidos) == (5, 12)
    assert resposta.por_dificuldade == {"Low": 2, "Medium": 0, "High": 1}
    assert len(resposta.entregas_por_dia) == 30
    assert (resposta.entregas_por_dia[-1].dia, resposta.entregas_por_dia[-1].concluidos) == (
        "2026-02-10",
        1,
    )
    semanas = {s.semana: s.concluidos for s in resposta.entregas_por_semana}
    assert len(semanas) == 12
    assert (semanas["2026-02-02"], semanas["2026-02-09"]) == (3, 1)
    unidade_id, pessoa_id, desde, fuso = repo.resumir_pessoal.call_args.args
    assert (unidade_id, pessoa_id, fuso) == (dev.unidade_id, dev.id, "UTC")
    assert desde == datetime(2025, 11, 24, tzinfo=ZoneInfo("UTC"))


@pytest.mark.asyncio
async def test_falha_obter_pessoal_fuso_invalido(repo):
    with pytest.raises(InvalidInputException):
        await _service(repo).obter_pessoal(_usuario("USUARIO_PADRAO"), "Lua/Crateras")


# Spec 064: andamento, em correção e Pass Rate por projeto no GET /api/overview/time.


@pytest.mark.asyncio
async def test_obter_time_monta_os_graficos_do_gerente_e_do_admin(repo):
    clock, alarm = uuid4(), uuid4()
    time_id, setor_id = uuid4(), uuid4()
    repo.resumir_time.return_value = ResumoTime(
        projetos=[
            ProjetoOverview(alarm, "Alarm 2.0", "Alarm"),
            ProjetoOverview(clock, "Clock 9.5", "Clock"),
        ],
        andamento_por_time=[Andamento(time_id, "QA", 3, 4, 5)],
        andamento_por_setor=[Andamento(setor_id, "Mobile", 3, 4, 5)],
        em_correcao_por_projeto={clock: 3},
        pass_rate_por_projeto={clock: (8, 10)},
    )
    gerente = _usuario("GERENTE", time_ids=(time_id,))

    resposta = await _service(repo).obter_time(gerente, "UTC")

    assert [
        (a.nome, a.a_fazer, a.em_andamento, a.concluidos) for a in resposta.andamento_por_time
    ] == [("QA", 3, 4, 5)]
    assert resposta.andamento_por_setor[0].id == setor_id
    # Só os projetos com In Fixes e só os com rodada, na ordem dos projetos.
    assert [(p.projeto, p.em_correcao) for p in resposta.em_correcao_por_projeto] == [
        ("Clock 9.5", 3)
    ]
    assert [(p.projeto, p.aprovados, p.total) for p in resposta.pass_rate_por_projeto] == [
        ("Clock 9.5", 8, 10)
    ]
    assert repo.resumir_time.call_args.args[1] == EscopoOverview(time_ids=gerente.times_no_escopo)


@pytest.mark.asyncio
async def test_obter_time_admin_consulta_a_unidade_inteira(repo):
    repo.resumir_time.return_value = ResumoTime()

    resposta = await _service(repo).obter_time(_usuario("ADMIN_UNIDADE"), "UTC")

    assert repo.resumir_time.call_args.args[1] == EscopoOverview()
    assert resposta.pass_rate_por_projeto == resposta.em_correcao_por_projeto == []


@pytest.mark.asyncio
async def test_obter_pessoal_devolve_os_projetos_do_dev_com_as_contagens(repo):
    # Spec 064, RN-12: os cards do dev são do projeto escolhido.
    projeto_id = uuid4()
    repo.resumir_pessoal.return_value = ResumoPessoal(
        por_projeto=[ProjetoPessoal(projeto_id, "Clock 9.5", "Clock", 2, 1, 5)]
    )

    resposta = await _service(repo).obter_pessoal(_usuario("USUARIO_PADRAO"), "UTC")

    [projeto] = resposta.projetos
    assert (projeto.projeto_id, projeto.projeto, projeto.app) == (projeto_id, "Clock 9.5", "Clock")
    assert (projeto.concluidos, projeto.em_andamento, projeto.atribuidos) == (2, 1, 5)
