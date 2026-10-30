import os
from uuid import uuid4

import pytest
import pytest_asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from src.infrastructure.data.auditoria import (
    ContextoAuditoriaImpl,
    tela_auditoria,
    usuario_auditoria,
)
from tests.integration.test_resultado_form_factor_repository import _Cenario

pytestmark = pytest.mark.skipif(
    not os.environ.get("SDF_TEST_DATABASE_URL"),
    reason="Defina SDF_TEST_DATABASE_URL para executar a integração com Postgres.",
)

# Spec 038 e ADR 0044: o contexto da auditoria chega a cada transação pelo listener after_begin.


@pytest_asyncio.fixture
async def cenario():
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


async def _ultimo_registro(session, row_id):
    resultado = await session.execute(
        text(
            "SELECT usuario_id, origem, tela FROM auditoria_alteracoes "
            "WHERE row_id = :id ORDER BY id DESC LIMIT 1"
        ),
        {"id": row_id},
    )
    return resultado.mappings().one()


@pytest.mark.asyncio
async def test_transacao_aberta_depois_do_commit_recebe_o_usuario_do_contexto(cenario):
    session = cenario.session
    # A transação do cenário começou sem usuário; o contexto só é preenchido depois.
    caso_id = await cenario.caso("Clock_001", status="InProgress")
    token = usuario_auditoria.set(cenario.ana)
    token_tela = tela_auditoria.set("/projetos/1")
    try:
        await session.commit()
        await session.execute(
            text("UPDATE casos_teste SET status = 'InReview' WHERE id = :id"), {"id": caso_id}
        )
        registro = await _ultimo_registro(session, caso_id)
    finally:
        usuario_auditoria.reset(token)
        tela_auditoria.reset(token_tela)

    assert registro["usuario_id"] == cenario.ana
    assert registro["origem"] == "api"
    assert registro["tela"] == "/projetos/1"


@pytest.mark.asyncio
async def test_definir_origem_vale_so_para_a_transacao_aberta(cenario):
    session = cenario.session
    caso_id = await cenario.caso("Clock_001", status="InValidation")

    await ContextoAuditoriaImpl(session).definir_origem("form_factor")
    await session.execute(
        text("UPDATE casos_teste SET status = 'InFixes' WHERE id = :id"), {"id": caso_id}
    )
    assert (await _ultimo_registro(session, caso_id))["origem"] == "form_factor"


@pytest.mark.asyncio
async def test_falha_origem_nao_passa_para_a_transacao_seguinte():
    # Sem a transação externa do cenário: aqui o commit encerra a transação de verdade.
    engine = create_async_engine(os.environ["SDF_TEST_DATABASE_URL"])
    try:
        async with AsyncSession(engine) as session:
            await ContextoAuditoriaImpl(session).definir_origem("form_factor")
            await session.commit()
            origem = await session.scalar(text("SELECT current_setting('app.origem', true)"))
    finally:
        await engine.dispose()

    assert not origem


@pytest.mark.asyncio
async def test_falha_sem_contexto_o_registro_fica_sem_usuario_e_com_origem_api(cenario):
    caso_id = await cenario.caso("Clock_001")

    registro = await _ultimo_registro(cenario.session, caso_id)

    assert registro["usuario_id"] is None
    assert registro["origem"] == "api"
