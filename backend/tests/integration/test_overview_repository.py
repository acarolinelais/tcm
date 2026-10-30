import json
import os
from datetime import UTC, datetime
from uuid import uuid4

import pytest
import pytest_asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from src.domain.queries.resumo_overview import EscopoOverview
from src.infrastructure.data.auditoria import usuario_auditoria
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
