import os
from datetime import datetime
from uuid import uuid4

import pytest
import pytest_asyncio
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from src.domain.entities.caso_teste import StatusCasoTeste
from src.domain.entities.importacao_sdf_status import ImportacaoSdfStatus
from src.infrastructure.data.models.caso_teste_model import CasoTesteModel
from src.infrastructure.repositories.caso_teste_repository import CasoTesteRepositoryImpl
from src.infrastructure.repositories.importacao_sdf_repository import ImportacaoSdfRepositoryImpl
from src.infrastructure.repositories.importacao_sdf_status_repository import (
    ImportacaoSdfStatusRepositoryImpl,
)
from tests.integration.test_resultado_form_factor_repository import _Cenario

pytestmark = pytest.mark.skipif(
    not os.environ.get("SDF_TEST_DATABASE_URL"),
    reason="Defina SDF_TEST_DATABASE_URL para executar a integração com Postgres.",
)

DIA = datetime(2026, 11, 6, 9)


@pytest_asyncio.fixture
async def cenario():
    engine = create_async_engine(os.environ["SDF_TEST_DATABASE_URL"])
    try:
        async with async_sessionmaker(engine, expire_on_commit=False)() as session:
            yield await _Cenario(session, uuid4()).montar()
            await session.rollback()
    finally:
        await engine.dispose()


async def _mudar_status(cenario, caso_id, status):
    await cenario.session.execute(
        text("UPDATE casos_teste SET status = :status WHERE id = :id"),
        {"status": status, "id": caso_id},
    )


async def _importacao_com_status(cenario, caso_id, aplicado):
    importacao = await cenario.importar(caso_id, "SDF-1", DIA, {cenario.s26: "PASS"})
    await ImportacaoSdfStatusRepositoryImpl(cenario.session).adicionar(
        ImportacaoSdfStatus(cenario.unidade_id, importacao.id, caso_id, aplicado)
    )
    await _mudar_status(cenario, caso_id, aplicado.value)
    return await ImportacaoSdfRepositoryImpl(cenario.session).obter_por_id(
        cenario.unidade_id, importacao.id
    )


@pytest.mark.asyncio
async def test_ultima_ativa_traz_a_mais_recente_com_o_que_o_dialogo_mostra(cenario):
    caso_id = await cenario.caso("TC-001")
    await cenario.importar(caso_id, "SDF-1", DIA, {cenario.s26: "PASS"}, datetime(2026, 11, 6, 10))
    recente = await cenario.importar(
        caso_id, "SDF-2", DIA, {cenario.s25: "FAIL"}, datetime(2026, 11, 7, 10)
    )

    ultima = await ImportacaoSdfRepositoryImpl(cenario.session).obter_ultima_ativa(
        cenario.unidade_id, cenario.projeto_id
    )

    assert (ultima.id, ultima.sdf_id, ultima.device) == (recente.id, "SDF-2", "SAMSUNG S25")
    assert (ultima.data_execucao, ultima.importado_por_nome) == (DIA, "Ana")


@pytest.mark.asyncio
async def test_desfeita_sai_e_a_anterior_vira_a_ultima(cenario):
    # CA-05.
    caso_id = await cenario.caso("TC-001")
    anterior = await cenario.importar(
        caso_id, "SDF-1", DIA, {cenario.s26: "PASS"}, datetime(2026, 11, 6, 10)
    )
    recente = await cenario.importar(
        caso_id, "SDF-2", DIA, {cenario.s25: "FAIL"}, datetime(2026, 11, 7, 10)
    )
    repo = ImportacaoSdfRepositoryImpl(cenario.session)
    entidade = await repo.obter_por_id(cenario.unidade_id, recente.id)
    entidade.desfazer(cenario.bia)
    await repo.atualizar(entidade)
    await cenario.session.flush()

    ultima = await repo.obter_ultima_ativa(cenario.unidade_id, cenario.projeto_id)
    desfeita = await repo.obter_por_id(cenario.unidade_id, recente.id)

    assert ultima.id == anterior.id
    assert (desfeita.ativo, desfeita.desfeita_por) == (False, cenario.bia)
    assert desfeita.desfeita_em is not None


@pytest.mark.asyncio
async def test_falha_sem_importacao_ativa_nao_ha_ultima(cenario):
    # CA-09.
    assert (
        await ImportacaoSdfRepositoryImpl(cenario.session).obter_ultima_ativa(
            cenario.unidade_id, cenario.projeto_id
        )
        is None
    )


@pytest.mark.asyncio
async def test_revertivel_e_o_caso_que_ninguem_moveu_depois(cenario):
    parado = await cenario.caso("TC-001")
    importacao = await _importacao_com_status(cenario, parado, StatusCasoTeste.IN_FIXES)

    revertiveis = await ImportacaoSdfStatusRepositoryImpl(cenario.session).listar_revertiveis(
        cenario.unidade_id, importacao.id, importacao.created_at
    )

    assert [(r.caso_teste_id, r.status_aplicado) for r in revertiveis] == [
        (parado, StatusCasoTeste.IN_FIXES)
    ]


@pytest.mark.asyncio
async def test_falha_caso_movido_depois_nao_e_revertivel(cenario):
    # CA-03: a importação levou para Done e alguém moveu para In Progress.
    movido = await cenario.caso("TC-001")
    importacao = await _importacao_com_status(cenario, movido, StatusCasoTeste.DONE)
    await _mudar_status(cenario, movido, "InProgress")

    revertiveis = await ImportacaoSdfStatusRepositoryImpl(cenario.session).listar_revertiveis(
        cenario.unidade_id, importacao.id, importacao.created_at
    )

    assert revertiveis == ()


@pytest.mark.asyncio
async def test_limpar_todos_aprovados_zera_a_end_date(cenario):
    # CA-04: o marcar_todos_aprovados recalcula depois.
    caso_id = await cenario.caso("TC-001")
    await cenario.session.execute(
        text("UPDATE casos_teste SET all_passed_em = :data WHERE id = :id"),
        {"data": DIA, "id": caso_id},
    )

    await CasoTesteRepositoryImpl(cenario.session).limpar_todos_aprovados(
        cenario.unidade_id, [caso_id]
    )

    assert (
        await cenario.session.execute(
            select(CasoTesteModel.all_passed_em).where(CasoTesteModel.id == caso_id)
        )
    ).scalar_one() is None
