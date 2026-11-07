import json
import os
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
import pytest_asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from src.domain.entities.execucao_sdf import ExecucaoSdf
from src.domain.queries.resumo_overview import EscopoOverview, ResumoPessoal, ResumoTime
from src.infrastructure.data.auditoria import usuario_auditoria
from src.infrastructure.data.models.caso_teste_model import CasoTesteModel
from src.infrastructure.data.models.perfil_model import PerfilModel
from src.infrastructure.data.models.projeto_model import ProjetoModel
from src.infrastructure.data.models.time_membro_model import TimeMembroModel
from src.infrastructure.data.models.time_model import TimeModel
from src.infrastructure.data.models.usuario_model import UsuarioModel
from src.infrastructure.repositories.execucao_sdf_repository import ExecucaoSdfRepositoryImpl
from src.infrastructure.repositories.overview_repository import OverviewRepositoryImpl
from tests.integration.test_resultado_form_factor_repository import _Cenario

pytestmark = pytest.mark.skipif(
    not os.environ.get("SDF_TEST_DATABASE_URL"),
    reason="Defina SDF_TEST_DATABASE_URL para executar a integração com Postgres.",
)

DESDE = datetime(2025, 5, 1, tzinfo=UTC)


@pytest_asyncio.fixture
async def cenario():
    engine = create_async_engine(os.environ["SDF_TEST_DATABASE_URL"])
    token = usuario_auditoria.set(None)
    try:
        async with engine.connect() as conexao:
            transacao = await conexao.begin()
            session = AsyncSession(
                bind=conexao, join_transaction_mode="create_savepoint", expire_on_commit=False
            )
            yield await _Cenario(session, uuid4()).montar()
            await session.close()
            await transacao.rollback()
    finally:
        usuario_auditoria.reset(token)
        await engine.dispose()


async def _resumir(cenario, escopo, usuario_id=None, unidade_id=None, fuso="UTC"):
    return await OverviewRepositoryImpl(cenario.session).resumir(
        unidade_id or cenario.unidade_id, escopo, usuario_id or cenario.ana, DESDE, fuso
    )


async def _entrou_em_done(cenario, caso_id, quando):
    # A auditoria aceita INSERT; assim o registro fica com a data do passado que o teste precisa.
    await cenario.session.execute(
        text(
            "INSERT INTO auditoria_alteracoes (unidade_id, table_name, operation, row_id, "
            "new_values, changed_fields, origem, created_at) "
            "VALUES (:u, 'casos_teste', 'UPDATE', :id, CAST(:novo AS JSONB), "
            "ARRAY['status'], 'api', :quando)"
        ),
        {
            "u": cenario.unidade_id,
            "id": caso_id,
            "novo": json.dumps({"status": "Done"}),
            "quando": quando,
        },
    )


@pytest.mark.asyncio
async def test_resumir_gerente_conta_concluidos_e_total(cenario):
    statuses = ["Done"] * 4 + ["InProgress", "InReview", "InFixes"] + ["To-Do"] * 3
    for i, status in enumerate(statuses):
        await cenario.caso(f"Clock_{i:03}", status=status, responsavel_id=cenario.bia)
    await cenario.caso("Clock_100", status="To-Do")

    resumo = await _resumir(cenario, EscopoOverview(time_ids=(cenario.time_id,)))

    assert (resumo.total, resumo.concluidos, resumo.em_andamento, resumo.a_fazer) == (11, 4, 3, 4)
    assert resumo.atribuidos == 1


@pytest.mark.asyncio
async def test_resumir_pessoa_conta_so_casos_do_dev(cenario):
    await cenario.caso("Clock_001", responsavel_id=cenario.bia, status="Done")
    await cenario.caso("Clock_002", backup_id=cenario.bia, status="To-Do")
    for i in range(3, 10):
        await cenario.caso(f"Clock_{i:03}")

    resumo = await _resumir(cenario, EscopoOverview(pessoa_id=cenario.bia), cenario.bia)

    assert (resumo.total, resumo.concluidos, resumo.a_fazer, resumo.atribuidos) == (2, 1, 1, 1)


@pytest.mark.asyncio
async def test_resumir_desempenho_conta_casos_que_entraram_em_done_no_mes(cenario):
    primeiro = await cenario.caso("Clock_001", status="InValidation")
    segundo = await cenario.caso("Clock_002", status="InValidation")
    await _entrou_em_done(cenario, primeiro, datetime(2025, 9, 3, 12, tzinfo=UTC))
    await _entrou_em_done(cenario, segundo, datetime(2025, 9, 20, 12, tzinfo=UTC))
    # O mesmo caso de novo em Done no mês conta uma vez só.
    await _entrou_em_done(cenario, segundo, datetime(2025, 9, 25, 12, tzinfo=UTC))
    # Antes de `desde` não entra.
    await _entrou_em_done(cenario, primeiro, datetime(2025, 4, 30, 12, tzinfo=UTC))
    # O trigger grava a mudança real de Status no mês atual.
    await cenario.session.execute(
        text("UPDATE casos_teste SET status = 'Done' WHERE id = :id"), {"id": primeiro}
    )
    # Mudar outro campo de um caso já em Done não conta.
    await cenario.session.execute(
        text("UPDATE casos_teste SET category = 'B' WHERE id = :id"), {"id": primeiro}
    )

    resumo = await _resumir(cenario, EscopoOverview())

    mes_atual = datetime.now(UTC).strftime("%Y-%m")
    assert resumo.concluidos_por_mes == {"2025-09": 2, mes_atual: 1}


@pytest.mark.asyncio
async def test_resumir_desempenho_usa_o_fuso_pedido(cenario):
    caso_id = await cenario.caso("Clock_001")
    await _entrou_em_done(cenario, caso_id, datetime(2025, 10, 1, 1, tzinfo=UTC))

    resumo = await _resumir(cenario, EscopoOverview(), fuso="America/Sao_Paulo")

    assert resumo.concluidos_por_mes == {"2025-09": 1}


@pytest.mark.asyncio
async def test_resumir_ignora_caso_excluido(cenario):
    await cenario.caso("Clock_001", status="Done")
    excluido = await cenario.caso("Clock_002", status="Cancelled")
    await cenario.caso("Clock_003", status="Done", ativo=False)
    await _entrou_em_done(cenario, excluido, datetime(2025, 9, 3, tzinfo=UTC))

    resumo = await _resumir(cenario, EscopoOverview())

    assert (resumo.total, resumo.concluidos) == (1, 1)
    # Só o caso criado já em Done conta, pelo INSERT gravado pelo trigger.
    assert resumo.concluidos_por_mes == {datetime.now(UTC).strftime("%Y-%m"): 1}


@pytest.mark.asyncio
async def test_falha_time_fora_do_escopo_nao_conta(cenario):
    await cenario.caso("Clock_001", status="Done")

    resumo = await _resumir(cenario, EscopoOverview(time_ids=(uuid4(),)))

    assert (resumo.total, resumo.concluidos, resumo.concluidos_por_mes) == (0, 0, {})


@pytest.mark.asyncio
async def test_resumir_nao_conta_outra_unidade(cenario):
    caso_id = await cenario.caso("Clock_001", status="Done")
    await _entrou_em_done(cenario, caso_id, datetime(2025, 9, 3, tzinfo=UTC))

    resumo = await _resumir(cenario, EscopoOverview(), unidade_id=uuid4())

    assert (resumo.total, resumo.concluidos_por_mes) == (0, {})


# Spec 063: gráficos do escopo de times.


async def _resumir_time(cenario, escopo=None, desde=DESDE):
    escopo = escopo or EscopoOverview(time_ids=(cenario.time_id,))
    return await OverviewRepositoryImpl(cenario.session).resumir_time(
        cenario.unidade_id, escopo, desde, desde, "UTC"
    )


async def _membros(cenario, *usuarios):
    for usuario_id in usuarios:
        cenario.session.add(
            TimeMembroModel(
                id=uuid4(),
                unidade_id=cenario.unidade_id,
                time_id=cenario.time_id,
                usuario_id=usuario_id,
            )
        )
    await cenario.session.flush()


@pytest.mark.asyncio
async def test_resumir_time_lista_os_projetos_ativos_em_ordem_alfabetica(cenario):
    for nome, ativo in (("Alarm 2.0", True), ("Zeta 1.0", False)):
        cenario.session.add(
            ProjetoModel(
                id=uuid4(),
                unidade_id=cenario.unidade_id,
                time_id=cenario.time_id,
                nome=nome,
                app=nome.split()[0],
                one_ui="9.5",
                ativo=ativo,
            )
        )
    await cenario.session.flush()

    resumo = await _resumir_time(cenario)

    assert [projeto.nome for projeto in resumo.projetos] == ["Alarm 2.0", "Clock 9.5"]


@pytest.mark.asyncio
async def test_resumir_time_criacao_conta_so_os_criados_desde_o_dia(cenario):
    antigo = await cenario.caso("Clock_001")
    await cenario.caso("Clock_002")
    await cenario.caso("Clock_003")
    await cenario.session.execute(
        text("UPDATE casos_teste SET created_at = :quando WHERE id = :id"),
        {"quando": datetime(2025, 4, 1, tzinfo=UTC), "id": antigo},
    )

    resumo = await _resumir_time(cenario)

    assert resumo.criados_por_projeto == {cenario.projeto_id: 2}


@pytest.mark.asyncio
async def test_resumir_time_concluidos_por_dev_so_devs_sem_backup_e_com_zero(cenario):
    # Ana e Bia têm o perfil de dev; o KP do time fica fora, mesmo com Test Cases em Done.
    await cenario.session.execute(
        text(
            "UPDATE perfis SET codigo = 'USUARIO_PADRAO' "
            "WHERE id = (SELECT perfil_id FROM usuarios WHERE id = :id)"
        ),
        {"id": cenario.ana},
    )
    perfil_kp, kp = uuid4(), uuid4()
    cenario.session.add(
        PerfilModel(id=perfil_kp, unidade_id=cenario.unidade_id, nome="KP", codigo="KP")
    )
    await cenario.session.flush()
    cenario.session.add(
        UsuarioModel(
            id=kp,
            unidade_id=cenario.unidade_id,
            nome="Kaique",
            email=f"kp-{kp}@example.com",
            perfil_id=perfil_kp,
        )
    )
    await cenario.session.flush()
    await _membros(cenario, cenario.ana, cenario.bia, kp)
    for i in range(3):
        await cenario.caso(f"Clock_{i:03}", status="Done", backup_id=cenario.bia)
    await cenario.caso("Clock_010", status="InProgress", responsavel_id=cenario.bia)
    await cenario.caso("Clock_020", status="Done", responsavel_id=kp)

    resumo = await _resumir_time(cenario)

    por_dev = [(dev.nome, dev.concluidos) for dev in resumo.concluidos_por_dev]
    assert por_dev == [("Ana", 3), ("Bia", 0)]


@pytest.mark.asyncio
async def test_resumir_time_concluidos_por_semana_usa_a_ultima_entrada_em_done(cenario):
    primeiro = await cenario.caso("Clock_001")
    segundo = await cenario.caso("Clock_002")
    # Quarta 3/9 e, de novo, quarta 10/9: vale só a semana de 8/9.
    await _entrou_em_done(cenario, primeiro, datetime(2025, 9, 3, 12, tzinfo=UTC))
    await _entrou_em_done(cenario, primeiro, datetime(2025, 9, 10, 12, tzinfo=UTC))
    await _entrou_em_done(cenario, segundo, datetime(2025, 9, 14, 12, tzinfo=UTC))
    # Antes de `desde` não entra.
    terceiro = await cenario.caso("Clock_003")
    await _entrou_em_done(cenario, terceiro, datetime(2025, 4, 30, 12, tzinfo=UTC))

    resumo = await _resumir_time(cenario)

    assert resumo.concluidos_por_semana == {"2025-09-08": 2}


@pytest.mark.asyncio
async def test_resumir_time_done_por_projeto_ignora_excluded(cenario):
    statuses = ["Done"] * 4 + ["To-Do"] * 3 + ["InFixes", "InReview", "Cancelled"]
    for i, status in enumerate(statuses):
        await cenario.caso(f"Clock_{i:03}", status=status)

    resumo = await _resumir_time(cenario)

    assert resumo.done_por_projeto == {cenario.projeto_id: (4, 9)}
    # Spec 064, RN-12: In Fixes e In Review contam como em andamento; To-Do e Excluded, não.
    assert resumo.em_andamento_por_projeto == {cenario.projeto_id: 2}


@pytest.mark.asyncio
async def test_falha_resumir_time_fora_do_escopo_nao_mostra_nada(cenario):
    await _membros(cenario, cenario.ana)
    caso_id = await cenario.caso("Clock_001", status="Done")
    await _entrou_em_done(cenario, caso_id, datetime(2025, 9, 3, tzinfo=UTC))

    resumo = await _resumir_time(cenario, EscopoOverview(time_ids=(uuid4(),)))

    assert resumo == ResumoTime()


# Spec 063: burndown, Pass Rate e visão pessoal.


@pytest.mark.asyncio
async def test_burndown_executado_conta_o_que_nao_estava_em_done_no_fim_de_cada_dia(cenario):
    agora = datetime.now(UTC)
    await cenario.caso("Clock_001", status="Done")
    depois = await cenario.caso("Clock_002", status="InValidation")
    await cenario.caso("Clock_003", status="To-Do")
    await cenario.caso("Clock_004", status="Cancelled")
    # Clock_002 entra em Done daqui a 2 dias: até lá, ainda conta como não Done.
    await _entrou_em_done(cenario, depois, agora + timedelta(days=2))
    # Antes de qualquer caso existir, nada conta.
    fins = [datetime(2025, 1, 1, tzinfo=UTC), agora + timedelta(days=1), agora + timedelta(days=3)]

    executado = await OverviewRepositoryImpl(cenario.session).burndown_executado(
        cenario.unidade_id, cenario.projeto_id, fins
    )

    assert executado == [0, 2, 1]


@pytest.mark.asyncio
async def test_burndown_caso_anterior_a_auditoria_usa_o_status_que_a_mudanca_substituiu(cenario):
    # Simula um caso criado antes da auditoria (ADR 0044): a primeira mudança registrada é a
    # ida para Done em 01/07/2025, e o caso já existia em 01/06.
    caso_id = await cenario.caso("Clock_001", status="InValidation")
    await cenario.session.execute(
        text("UPDATE casos_teste SET created_at = :quando WHERE id = :id"),
        {"quando": datetime(2025, 1, 1), "id": caso_id},
    )
    await cenario.session.execute(
        text(
            "INSERT INTO auditoria_alteracoes (unidade_id, table_name, operation, row_id, "
            "old_values, new_values, changed_fields, origem, created_at) "
            "VALUES (:u, 'casos_teste', 'UPDATE', :id, CAST(:velho AS JSONB), "
            "CAST(:novo AS JSONB), ARRAY['status'], 'api', :quando)"
        ),
        {
            "u": cenario.unidade_id,
            "id": caso_id,
            "velho": json.dumps({"status": "InValidation"}),
            "novo": json.dumps({"status": "Done"}),
            "quando": datetime(2025, 7, 1, tzinfo=UTC),
        },
    )
    # O INSERT gravado agora pelo trigger fica depois dos dois dias consultados.
    await cenario.session.execute(
        text("UPDATE casos_teste SET status = 'Done' WHERE id = :id"), {"id": caso_id}
    )
    fins = [datetime(2025, 6, 1, tzinfo=UTC), datetime(2025, 8, 1, tzinfo=UTC)]

    executado = await OverviewRepositoryImpl(cenario.session).burndown_executado(
        cenario.unidade_id, cenario.projeto_id, fins
    )

    assert executado == [1, 0]


@pytest.mark.asyncio
async def test_falha_burndown_de_outro_projeto_fica_zerado(cenario):
    await cenario.caso("Clock_001", status="To-Do")
    fim = datetime.now(UTC) + timedelta(days=1)

    executado = await OverviewRepositoryImpl(cenario.session).burndown_executado(
        cenario.unidade_id, uuid4(), [fim]
    )

    assert executado == [0]


async def _execucao_na_rodada(cenario, rodada, caso_id, resultados):
    execucao = ExecucaoSdf(
        cenario.unidade_id,
        None,
        caso_id,
        "SDF-1",
        rodada.created_at,
        "9.5",
        origem="MANUAL",
        rodada_id=rodada.id,
    )
    await ExecucaoSdfRepositoryImpl(cenario.session).adicionar(execucao)
    await cenario.session.flush()
    await cenario.registrar(execucao, resultados)


@pytest.mark.asyncio
async def test_pass_rate_usa_so_a_rodada_mais_recente(cenario):
    _, execucao = await cenario.rodada(
        await cenario.caso("Clock_001"), "SDF-0", datetime(2025, 9, 1, tzinfo=UTC)
    )
    await cenario.registrar(execucao, {cenario.s26: "FAIL", cenario.s25: "FAIL"})
    recente, execucao = await cenario.rodada(
        await cenario.caso("Clock_002"), "SDF-1", datetime(2025, 10, 1, tzinfo=UTC)
    )
    await cenario.registrar(execucao, {cenario.s26: "PASS", cenario.s25: "FAIL"})
    for i, resultado in enumerate(("PASS", "PASS", "FAIL")):
        await _execucao_na_rodada(
            cenario, recente, await cenario.caso(f"Clock_1{i:02}"), {cenario.s26: resultado}
        )

    pass_rate = await OverviewRepositoryImpl(cenario.session).pass_rate_ultima_rodada(
        cenario.unidade_id, cenario.projeto_id
    )

    # Com a rodada antiga junto, o S26 daria 3 de 5.
    assert [(m.modelo, m.aprovados, m.total) for m in pass_rate.modelos] == [
        ("SAMSUNG S25", 0, 1),
        ("SAMSUNG S26", 3, 4),
    ]


@pytest.mark.asyncio
async def test_falha_pass_rate_sem_rodada_e_nulo(cenario):
    await cenario.caso("Clock_001")

    pass_rate = await OverviewRepositoryImpl(cenario.session).pass_rate_ultima_rodada(
        cenario.unidade_id, cenario.projeto_id
    )

    assert pass_rate is None


@pytest.mark.asyncio
async def test_resumir_pessoal_conta_so_os_casos_em_que_e_principal(cenario):
    for i, (dificuldade, status) in enumerate(
        (("Low", "Done"), ("Low", "To-Do"), ("High", "Done"), ("Medium", "Cancelled"))
    ):
        caso_id = await cenario.caso(f"Clock_{i:03}", status=status, responsavel_id=cenario.bia)
        await cenario.session.execute(
            text("UPDATE casos_teste SET difficulty = :d WHERE id = :id"),
            {"d": dificuldade, "id": caso_id},
        )
    # Ser Backup não conta.
    await cenario.caso("Clock_010", status="Done", backup_id=cenario.bia)

    resumo = await OverviewRepositoryImpl(cenario.session).resumir_pessoal(
        cenario.unidade_id, cenario.bia, DESDE, "UTC"
    )

    assert (resumo.concluidos, resumo.atribuidos) == (2, 3)
    assert resumo.por_dificuldade == {"Low": 2, "High": 1}
    # Os dois criados já em Done entram hoje, pelo INSERT do trigger.
    assert resumo.concluidos_por_dia == {datetime.now(UTC).strftime("%Y-%m-%d"): 2}
    # Spec 064, RN-12: o projeto do cenário, com os mesmos casos (o Backup e o Excluded ficam fora).
    assert [
        (p.projeto, p.concluidos, p.em_andamento, p.atribuidos) for p in resumo.por_projeto
    ] == [("Clock 9.5", 2, 0, 3)]


@pytest.mark.asyncio
async def test_falha_resumir_pessoal_de_outra_unidade_fica_vazio(cenario):
    await cenario.caso("Clock_001", status="Done", responsavel_id=cenario.bia)

    resumo = await OverviewRepositoryImpl(cenario.session).resumir_pessoal(
        uuid4(), cenario.bia, DESDE, "UTC"
    )

    assert resumo == ResumoPessoal()


# Spec 064: andamento por time e por setor, em correção e Pass Rate por projeto.


async def _outro_projeto(cenario, nome, time_id=None):
    """Projeto no `time_id` dado ou num time novo, no mesmo setor do cenário."""
    if time_id is None:
        setor_id = (
            await cenario.session.execute(
                text("SELECT setor_id FROM times WHERE id = :id"), {"id": cenario.time_id}
            )
        ).scalar_one()
        time_id = uuid4()
        cenario.session.add(
            TimeModel(
                id=time_id, unidade_id=cenario.unidade_id, setor_id=setor_id, nome=f"Time {nome}"
            )
        )
        await cenario.session.flush()
    projeto_id = uuid4()
    cenario.session.add(
        ProjetoModel(
            id=projeto_id,
            unidade_id=cenario.unidade_id,
            time_id=time_id,
            nome=nome,
            app=nome,
            one_ui="9.5",
        )
    )
    await cenario.session.flush()
    return projeto_id


async def _caso_no_projeto(cenario, projeto_id, tc_id, status):
    cenario.session.add(
        CasoTesteModel(
            id=uuid4(),
            unidade_id=cenario.unidade_id,
            projeto_id=projeto_id,
            tc_id=tc_id,
            category="A",
            difficulty="Low",
            situation="New",
            status=status,
            responsavel_id=cenario.ana,
        )
    )
    await cenario.session.flush()


@pytest.mark.asyncio
async def test_resumir_time_andamento_por_time_e_por_setor(cenario):
    for i, status in enumerate(["To-Do", "InProgress", "InFixes", "Done", "Done", "Cancelled"]):
        await cenario.caso(f"Clock_{i:03}", status=status)
    alarm = await _outro_projeto(cenario, "Alarm 2.0")
    await _caso_no_projeto(cenario, alarm, "Alarm_001", "InReview")

    resumo = await _resumir_time(cenario, EscopoOverview())

    andamento = [
        (a.nome, a.a_fazer, a.em_andamento, a.concluidos) for a in resumo.andamento_por_time
    ]
    assert andamento == [("QA", 1, 2, 2), ("Time Alarm 2.0", 0, 1, 0)]
    # Os dois times são do mesmo setor: o setor soma os dois.
    assert [
        (a.nome, a.a_fazer, a.em_andamento, a.concluidos) for a in resumo.andamento_por_setor
    ] == [("Mobile", 1, 3, 2)]


@pytest.mark.asyncio
async def test_resumir_time_em_correcao_so_projetos_com_in_fixes(cenario):
    for i in range(3):
        await cenario.caso(f"Clock_{i:03}", status="InFixes")
    alarm = await _outro_projeto(cenario, "Alarm 2.0", cenario.time_id)
    await _caso_no_projeto(cenario, alarm, "Alarm_001", "InValidation")

    resumo = await _resumir_time(cenario)

    assert resumo.em_correcao_por_projeto == {cenario.projeto_id: 3}


@pytest.mark.asyncio
async def test_pass_rate_por_projeto_usa_a_rodada_mais_recente(cenario):
    _, execucao = await cenario.rodada(
        await cenario.caso("Clock_001"), "SDF-0", datetime(2025, 9, 1, tzinfo=UTC)
    )
    await cenario.registrar(execucao, {cenario.s26: "FAIL", cenario.s25: "FAIL"})
    recente, execucao = await cenario.rodada(
        await cenario.caso("Clock_002"), "SDF-1", datetime(2025, 10, 1, tzinfo=UTC)
    )
    await cenario.registrar(execucao, {cenario.s26: "PASS", cenario.s25: "FAIL"})
    for i, resultado in enumerate(("PASS", "PASS", "PASS")):
        await _execucao_na_rodada(
            cenario, recente, await cenario.caso(f"Clock_1{i:02}"), {cenario.s26: resultado}
        )

    resumo = await _resumir_time(cenario)

    # A rodada antiga só tem FAIL e não conta: 4 PASS de 5 resultados na mais recente.
    assert resumo.pass_rate_por_projeto == {cenario.projeto_id: (4, 5)}


@pytest.mark.asyncio
async def test_pass_rate_por_projeto_ignora_projeto_sem_rodada(cenario):
    await cenario.caso("Clock_001")

    resumo = await _resumir_time(cenario, EscopoOverview())

    assert resumo.pass_rate_por_projeto == {}


@pytest.mark.asyncio
async def test_falha_resumir_time_de_outro_time_nao_mostra_andamento_nem_pass_rate(cenario):
    _, execucao = await cenario.rodada(
        await cenario.caso("Clock_001", status="InFixes"),
        "SDF-1",
        datetime(2025, 10, 1, tzinfo=UTC),
    )
    await cenario.registrar(execucao, {cenario.s26: "PASS"})

    resumo = await _resumir_time(cenario, EscopoOverview(time_ids=(uuid4(),)))

    assert resumo.andamento_por_time == resumo.andamento_por_setor == []
    assert resumo.em_correcao_por_projeto == resumo.pass_rate_por_projeto == {}
