import os
from uuid import uuid4

import pytest
import pytest_asyncio
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from tests.integration.test_resultado_form_factor_repository import _Cenario

pytestmark = pytest.mark.skipif(
    not os.environ.get("SDF_TEST_DATABASE_URL"),
    reason="Defina SDF_TEST_DATABASE_URL para executar a integração com Postgres.",
)

# Spec 038 e ADR 0044: os triggers gravam em auditoria_alteracoes na mesma transação da mudança.


@pytest_asyncio.fixture
async def cenario():
    """Tudo roda numa transação desfeita no fim do teste, incluindo os registros de auditoria."""
    engine = create_async_engine(os.environ["SDF_TEST_DATABASE_URL"])
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
        await engine.dispose()


async def _definir_contexto(session, usuario_id, origem=None):
    await session.execute(
        text("SELECT set_config('app.usuario_id', :u, true), set_config('app.origem', :o, true)"),
        {"u": str(usuario_id), "o": origem or ""},
    )


async def _registros(session, row_id):
    resultado = await session.execute(
        text(
            "SELECT table_name, operation, changed_fields, old_values, new_values, usuario_id, "
            "origem, unidade_id FROM auditoria_alteracoes WHERE row_id = :id ORDER BY id"
        ),
        {"id": row_id},
    )
    return resultado.mappings().all()


@pytest.mark.asyncio
async def test_mudar_o_status_grava_antes_depois_e_quem_mudou(cenario):
    session = cenario.session
    await _definir_contexto(session, cenario.ana)
    caso_id = await cenario.caso("Clock_001", status="InProgress")

    await session.execute(
        text("UPDATE casos_teste SET status = 'InReview', updated_at = now() WHERE id = :id"),
        {"id": caso_id},
    )

    criacao, mudanca = await _registros(session, caso_id)
    assert criacao["operation"] == "INSERT"
    assert criacao["table_name"] == "casos_teste"
    assert mudanca["operation"] == "UPDATE"
    assert mudanca["changed_fields"] == ["status"]
    assert mudanca["old_values"]["status"] == "InProgress"
    assert mudanca["new_values"]["status"] == "InReview"
    assert mudanca["usuario_id"] == cenario.ana
    assert mudanca["origem"] == "api"
    assert mudanca["unidade_id"] == cenario.unidade_id


@pytest.mark.asyncio
async def test_origem_vem_do_contexto_da_transacao(cenario):
    session = cenario.session
    caso_id = await cenario.caso("Clock_001", status="InValidation")
    await _definir_contexto(session, cenario.bia, "form_factor")

    await session.execute(
        text("UPDATE casos_teste SET status = 'InFixes' WHERE id = :id"), {"id": caso_id}
    )

    mudanca = (await _registros(session, caso_id))[-1]
    assert mudanca["origem"] == "form_factor"
    assert mudanca["usuario_id"] == cenario.bia


@pytest.mark.asyncio
async def test_link_de_pull_request_grava_inclusao_e_inativacao(cenario):
    session = cenario.session
    caso_id = await cenario.caso("Clock_001")
    link_id = uuid4()

    await session.execute(
        text(
            "INSERT INTO links_pull_request (id, unidade_id, caso_teste_id, url, created_by) "
            "VALUES (:id, :u, :c, 'https://github.com/org/repo/pull/1', :a)"
        ),
        {"id": link_id, "u": cenario.unidade_id, "c": caso_id, "a": cenario.ana},
    )
    await session.execute(
        text("UPDATE links_pull_request SET ativo = false WHERE id = :id"), {"id": link_id}
    )

    inclusao, inativacao = await _registros(session, link_id)
    assert (inclusao["table_name"], inclusao["operation"]) == ("links_pull_request", "INSERT")
    assert inclusao["new_values"]["caso_teste_id"] == str(caso_id)
    assert inativacao["changed_fields"] == ["ativo"]


@pytest.mark.asyncio
async def test_falha_gravacao_sem_mudanca_real_nao_gera_registro(cenario):
    session = cenario.session
    caso_id = await cenario.caso("Clock_001", status="InProgress")

    await session.execute(
        text("UPDATE casos_teste SET status = 'InProgress', updated_at = now() WHERE id = :id"),
        {"id": caso_id},
    )

    assert [r["operation"] for r in await _registros(session, caso_id)] == ["INSERT"]


@pytest.mark.asyncio
async def test_falha_mudanca_desfeita_nao_deixa_registro(cenario):
    session = cenario.session
    caso_id = await cenario.caso("Clock_001", status="InProgress")

    savepoint = await session.begin_nested()
    await session.execute(
        text("UPDATE casos_teste SET status = 'Done' WHERE id = :id"), {"id": caso_id}
    )
    await savepoint.rollback()

    assert [r["operation"] for r in await _registros(session, caso_id)] == ["INSERT"]


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "comando",
    [
        "UPDATE auditoria_alteracoes SET origem = 'adulterado' WHERE row_id = :id",
        "DELETE FROM auditoria_alteracoes WHERE row_id = :id",
        "TRUNCATE auditoria_alteracoes",
    ],
)
async def test_falha_historico_nao_pode_ser_alterado_nem_apagado(cenario, comando):
    session = cenario.session
    caso_id = await cenario.caso("Clock_001")

    savepoint = await session.begin_nested()
    with pytest.raises(DBAPIError, match="não pode ser alterado nem apagado"):
        await session.execute(text(comando), {"id": caso_id})
    await savepoint.rollback()

    assert len(await _registros(session, caso_id)) == 1


@pytest.mark.asyncio
async def test_grava_nome_e_perfil_do_momento_e_a_tela(cenario):
    session = cenario.session
    await session.execute(
        text("SELECT set_config('app.usuario_id', :u, true), set_config('app.tela', :t, true)"),
        {"u": str(cenario.ana), "t": "/projetos/1/kanban"},
    )
    caso_id = await cenario.caso("Clock_001", status="InProgress")
    perfil = await session.scalar(
        text("SELECT p.nome FROM perfis p JOIN usuarios u ON u.perfil_id = p.id WHERE u.id = :u"),
        {"u": cenario.ana},
    )
    # Renomear depois não muda o que já foi gravado.
    await session.execute(
        text("UPDATE usuarios SET nome = 'Ana Renomeada' WHERE id = :u"), {"u": cenario.ana}
    )

    registro = (
        await session.execute(
            text(
                "SELECT usuario_nome, perfil_nome, tela FROM auditoria_alteracoes "
                "WHERE row_id = :id"
            ),
            {"id": caso_id},
        )
    ).one()
    assert tuple(registro) == ("Ana", perfil, "/projetos/1/kanban")


@pytest.mark.asyncio
async def test_falha_sem_usuario_nao_ha_nome_perfil_nem_tela(cenario):
    caso_id = await cenario.caso("Clock_001")

    registro = (
        await cenario.session.execute(
            text(
                "SELECT usuario_nome, perfil_nome, tela FROM auditoria_alteracoes "
                "WHERE row_id = :id"
            ),
            {"id": caso_id},
        )
    ).one()
    assert tuple(registro) == (None, None, None)
