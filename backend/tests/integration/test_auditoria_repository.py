import os
from uuid import uuid4

import pytest
import pytest_asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from src.application.schemas.historico_caso_teste import alteracoes_do_registro
from src.domain.queries.auditoria import AcaoAuditoria, FiltrosAuditoria, OrigemAuditoria
from src.infrastructure.data.auditoria import usuario_auditoria
from src.infrastructure.repositories.auditoria_repository import AuditoriaRepositoryImpl
from tests.integration.test_resultado_form_factor_repository import _Cenario

pytestmark = pytest.mark.skipif(
    not os.environ.get("SDF_TEST_DATABASE_URL"),
    reason="Defina SDF_TEST_DATABASE_URL para executar a integração com Postgres.",
)


@pytest_asyncio.fixture
async def cenario():
    engine = create_async_engine(os.environ["SDF_TEST_DATABASE_URL"])
    # Sem usuário no contexto: o teste define autor, origem e tela direto na transação.
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


async def _como(session, usuario_id, origem="api", tela=""):
    await session.execute(
        text(
            "SELECT set_config('app.usuario_id', :u, true), set_config('app.origem', :o, true), "
            "set_config('app.tela', :t, true)"
        ),
        {"u": str(usuario_id), "o": origem, "t": tela},
    )


async def _status(session, caso_id, status):
    await session.execute(
        text("UPDATE casos_teste SET status = :s WHERE id = :id"), {"s": status, "id": caso_id}
    )


async def _listar(cenario, page=1, page_size=20, **filtros):
    return await AuditoriaRepositoryImpl(cenario.session).listar(
        cenario.unidade_id, FiltrosAuditoria(**filtros), page, page_size
    )


@pytest.mark.asyncio
async def test_filtra_por_usuario_e_periodo_do_mais_recente_ao_mais_antigo(cenario):
    session = cenario.session
    await _como(session, cenario.ana)
    caso_id = await cenario.caso("Clock_001", status="InProgress")
    marco = (await session.execute(text("SELECT clock_timestamp()"))).scalar_one()
    await _status(session, caso_id, "InReview")
    await _status(session, caso_id, "Done")
    await _como(session, cenario.bia)
    await _status(session, caso_id, "InFixes")

    resultado = await _listar(cenario, usuario_ids=[cenario.ana], inicio=marco)

    assert resultado.total_count == 2
    assert [linha.registro.new_values["status"] for linha in resultado.items] == [
        "Done",
        "InReview",
    ]
    linha = resultado.items[0]
    assert (linha.acao, linha.tc_id, linha.projeto_nome) == (
        AcaoAuditoria.ALTERACAO,
        "Clock_001",
        "Clock 9.5",
    )
    assert linha.registro.usuario_nome == "Ana"
    assert (await _listar(cenario, fim=marco)).total_count == 1  # só a criação


@pytest.mark.asyncio
async def test_filtra_pela_origem_form_factor(cenario):
    session = cenario.session
    await _como(session, cenario.ana)
    caso_id = await cenario.caso("Clock_001", status="InValidation")
    await _como(session, cenario.ana, origem="form_factor")
    await _status(session, caso_id, "InFixes")

    resultado = await _listar(cenario, origem=OrigemAuditoria.FORM_FACTOR)

    assert [(linha.acao, linha.registro.origem) for linha in resultado.items] == [
        (AcaoAuditoria.ALTERACAO, "form_factor")
    ]


@pytest.mark.asyncio
async def test_links_de_pr_viram_pr_incluido_e_pr_removido(cenario):
    session = cenario.session
    await _como(session, cenario.ana)
    caso_id = await cenario.caso("Clock_001")
    link_id = uuid4()
    await session.execute(
        text(
            "INSERT INTO links_pull_request (id, unidade_id, caso_teste_id, url, created_by) "
            "VALUES (:id, :u, :c, 'https://github.com/org/repo/pull/7', :a)"
        ),
        {"id": link_id, "u": cenario.unidade_id, "c": caso_id, "a": cenario.ana},
    )
    await session.execute(
        text("UPDATE links_pull_request SET ativo = false WHERE id = :id"), {"id": link_id}
    )

    removidos = await _listar(cenario, acao=AcaoAuditoria.PR_REMOVIDO)
    todos = await _listar(cenario)

    assert [(linha.caso_teste_id, linha.tc_id) for linha in removidos.items] == [
        (caso_id, "Clock_001")
    ]
    assert [linha.acao for linha in todos.items] == [
        AcaoAuditoria.PR_REMOVIDO,
        AcaoAuditoria.PR_INCLUIDO,
        AcaoAuditoria.CRIACAO,
    ]


@pytest.mark.asyncio
async def test_tc_id_e_tela_filtram_por_contem_sem_diferenciar_maiusculas(cenario):
    session = cenario.session
    await _como(session, cenario.ana, tela="/projetos/abc/kanban")
    await cenario.caso("Clock_001")
    await _como(session, cenario.ana, tela="/projetos/abc")
    await cenario.caso("Alarm_002")

    por_tc = await _listar(cenario, tc_id="clock")
    por_tela = await _listar(cenario, tela="KANBAN")

    assert [linha.tc_id for linha in por_tc.items] == ["Clock_001"]
    assert [linha.tela for linha in por_tela.items] == ["/projetos/abc/kanban"]


@pytest.mark.asyncio
async def test_pagina_45_registros_em_paginas_de_20(cenario):
    await _como(cenario.session, cenario.ana)
    for numero in range(45):
        await cenario.caso(f"Clock_{numero:03}")

    primeira = await _listar(cenario, page=1)
    terceira = await _listar(cenario, page=3)

    assert (primeira.total_count, len(primeira.items)) == (45, 20)
    assert len(terceira.items) == 5
    assert terceira.items[-1].tc_id == "Clock_000"


@pytest.mark.asyncio
async def test_falha_registros_de_outra_unidade_nunca_aparecem(cenario):
    await _como(cenario.session, cenario.ana)
    await cenario.caso("Clock_001")
    outra = await _Cenario(cenario.session, uuid4()).montar()
    await _como(cenario.session, outra.ana)
    await outra.caso("Clock_001")

    resultado = await _listar(cenario, tc_id="Clock")

    assert resultado.total_count == 1
    assert {linha.projeto_id for linha in resultado.items} == {cenario.projeto_id}


@pytest.mark.asyncio
async def test_falha_registro_que_so_mudou_coluna_tecnica_nao_aparece(cenario):
    session = cenario.session
    await _como(session, cenario.ana)
    caso_id = await cenario.caso("Clock_001")
    await session.execute(
        text("UPDATE casos_teste SET ativo = false WHERE id = :id"), {"id": caso_id}
    )

    resultado = await _listar(cenario)

    assert [linha.acao for linha in resultado.items] == [AcaoAuditoria.CRIACAO]


@pytest.mark.asyncio
async def test_toda_linha_do_sql_tem_alteracoes_no_python(cenario):
    # A regra de quais registros aparecem existe em SQL (`_acao`) e em Python
    # (`alteracoes_do_registro`): este teste falha se as duas se separarem.
    session = cenario.session
    await _como(session, cenario.ana)
    caso_id = await cenario.caso("Clock_001")
    await _status(session, caso_id, "Done")
    await session.execute(
        text("UPDATE casos_teste SET justificativa_exclusao = 'Sem automação' WHERE id = :id"),
        {"id": caso_id},
    )
    await session.execute(
        text("UPDATE casos_teste SET ativo = false WHERE id = :id"), {"id": caso_id}
    )
    link_id = uuid4()
    await session.execute(
        text(
            "INSERT INTO links_pull_request (id, unidade_id, caso_teste_id, url, created_by) "
            "VALUES (:id, :u, :c, 'https://github.com/org/repo/pull/8', :a)"
        ),
        {"id": link_id, "u": cenario.unidade_id, "c": caso_id, "a": cenario.ana},
    )
    await session.execute(
        text("UPDATE links_pull_request SET url = url || '#x' WHERE id = :id"), {"id": link_id}
    )
    await session.execute(
        text("UPDATE links_pull_request SET ativo = false WHERE id = :id"), {"id": link_id}
    )

    resultado = await _listar(cenario)
    todos = (
        await session.execute(
            text("SELECT count(*) FROM auditoria_alteracoes WHERE unidade_id = :u"),
            {"u": cenario.unidade_id},
        )
    ).scalar_one()

    assert all(alteracoes_do_registro(linha.registro, {}) for linha in resultado.items)
    # Ficam de fora só a inativação do caso e a troca da URL do link (sem mudança visível).
    assert (resultado.total_count, todos) == (5, 7)
