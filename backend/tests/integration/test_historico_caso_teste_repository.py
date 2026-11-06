import os
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
import pytest_asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from src.infrastructure.data.auditoria import usuario_auditoria
from src.infrastructure.repositories.historico_caso_teste_repository import (
    HistoricoCasoTesteRepositoryImpl,
)
from tests.integration.test_resultado_form_factor_repository import _Cenario

pytestmark = pytest.mark.skipif(
    not os.environ.get("SDF_TEST_DATABASE_URL"),
    reason="Defina SDF_TEST_DATABASE_URL para executar a integração com Postgres.",
)


@pytest_asyncio.fixture
async def cenario():
    engine = create_async_engine(os.environ["SDF_TEST_DATABASE_URL"])
    # Sem usuário no contexto: o teste define o autor direto na transação.
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


@pytest.mark.asyncio
async def test_lista_o_caso_e_os_prs_dele_do_mais_recente_ao_mais_antigo_com_o_autor(cenario):
    session = cenario.session
    await session.execute(
        text("SELECT set_config('app.usuario_id', :u, true)"), {"u": str(cenario.ana)}
    )
    caso_id = await cenario.caso("Clock_001", status="InProgress")
    outro_caso = await cenario.caso("Clock_002")
    await session.execute(
        text("UPDATE casos_teste SET status = 'InReview' WHERE id = :id"), {"id": caso_id}
    )
    await session.execute(
        text(
            "INSERT INTO links_pull_request (id, unidade_id, caso_teste_id, url, created_by) "
            "VALUES (:id, :u, :c, 'https://github.com/org/repo/pull/7', :a)"
        ),
        {"id": uuid4(), "u": cenario.unidade_id, "c": caso_id, "a": cenario.ana},
    )
    await session.execute(
        text("UPDATE casos_teste SET status = 'Done' WHERE id = :id"), {"id": outro_caso}
    )

    registros = await HistoricoCasoTesteRepositoryImpl(session).listar(cenario.unidade_id, caso_id)

    assert [(r.table_name, r.operation) for r in registros] == [
        ("links_pull_request", "INSERT"),
        ("casos_teste", "UPDATE"),
        ("casos_teste", "INSERT"),
    ]
    assert registros[1].changed_fields == ("status",)
    assert {r.usuario_nome for r in registros} == {"Ana"}


@pytest.mark.asyncio
async def test_falha_outra_unidade_nao_ve_o_historico(cenario):
    caso_id = await cenario.caso("Clock_001")

    assert await HistoricoCasoTesteRepositoryImpl(cenario.session).listar(uuid4(), caso_id) == []


async def _como(session, usuario_id):
    await session.execute(
        text("SELECT set_config('app.usuario_id', :u, true)"), {"u": str(usuario_id)}
    )


def _hoje():
    agora = datetime.now(UTC)
    return agora - timedelta(hours=1), agora + timedelta(hours=1)


@pytest.mark.asyncio
async def test_timeline_traz_casos_e_prs_do_projeto_no_periodo_com_o_responsavel(cenario):
    session = cenario.session
    # Ana faz as mudanças; a responsável do caso é a Bia.
    await _como(session, cenario.ana)
    caso_id = await cenario.caso("Clock_001", responsavel_id=cenario.bia)
    await session.execute(
        text(
            "INSERT INTO links_pull_request (id, unidade_id, caso_teste_id, url, created_by) "
            "VALUES (:id, :u, :c, 'https://github.com/org/repo/pull/7', :a)"
        ),
        {"id": uuid4(), "u": cenario.unidade_id, "c": caso_id, "a": cenario.ana},
    )
    await session.execute(
        text("UPDATE usuarios SET cor_avatar = 'roxo' WHERE id = :id"), {"id": cenario.bia}
    )

    registros = await HistoricoCasoTesteRepositoryImpl(session).listar_por_projeto(
        cenario.unidade_id, cenario.projeto_id, *_hoje()
    )

    assert [(r.registro.table_name, r.tc_id) for r in registros] == [
        ("links_pull_request", "Clock_001"),
        ("casos_teste", "Clock_001"),
    ]
    assert {
        (r.caso_teste_id, r.responsavel_id, r.responsavel_nome, r.responsavel_cor_avatar)
        for r in registros
    } == {(caso_id, cenario.bia, "Bia", "roxo")}
    assert {r.registro.usuario_nome for r in registros} == {"Ana"}


@pytest.mark.asyncio
async def test_timeline_mantem_nome_e_perfil_do_momento(cenario):
    session = cenario.session
    await _como(session, cenario.ana)
    await cenario.caso("Clock_001")
    await session.execute(
        text("UPDATE usuarios SET nome = 'Ana Souza' WHERE id = :id"), {"id": cenario.ana}
    )

    (registro,) = await HistoricoCasoTesteRepositoryImpl(session).listar_por_projeto(
        cenario.unidade_id, cenario.projeto_id, *_hoje()
    )

    # O autor fica como era no momento; o responsável vem com o nome de hoje.
    assert (registro.registro.usuario_nome, registro.responsavel_nome) == ("Ana", "Ana Souza")
    assert registro.registro.usuario_perfil is not None


@pytest.mark.asyncio
async def test_falha_timeline_ignora_outro_periodo_outro_projeto_e_outra_unidade(cenario):
    session = cenario.session
    await _como(session, cenario.ana)
    outro_projeto = uuid4()
    await session.execute(
        text(
            "INSERT INTO projetos (id, unidade_id, time_id, nome, app, one_ui) "
            "VALUES (:id, :u, :t, 'Outro', 'Clock', '9.5')"
        ),
        {"id": outro_projeto, "u": cenario.unidade_id, "t": cenario.time_id},
    )
    projeto_principal, cenario.projeto_id = cenario.projeto_id, outro_projeto
    await cenario.caso("Outro_001")
    repo = HistoricoCasoTesteRepositoryImpl(session)
    inicio, fim = _hoje()

    assert await repo.listar_por_projeto(cenario.unidade_id, projeto_principal, inicio, fim) == []
    assert await repo.listar_por_projeto(uuid4(), outro_projeto, inicio, fim) == []
    ontem = await repo.listar_por_projeto(
        cenario.unidade_id, outro_projeto, inicio - timedelta(days=1), fim - timedelta(days=1)
    )
    assert ontem == []
    assert len(await repo.listar_por_projeto(cenario.unidade_id, outro_projeto, inicio, fim)) == 1
