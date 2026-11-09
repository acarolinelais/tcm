import os
from datetime import datetime
from uuid import uuid4

import pytest
import pytest_asyncio
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from src.infrastructure.data.models.caso_teste_model import CasoTesteModel
from src.infrastructure.data.models.projeto_modelo_model import ProjetoModeloModel
from src.infrastructure.repositories.caso_teste_repository import CasoTesteRepositoryImpl
from tests.integration.test_resultado_form_factor_repository import _Cenario

pytestmark = pytest.mark.skipif(
    not os.environ.get("SDF_TEST_DATABASE_URL"),
    reason="Defina SDF_TEST_DATABASE_URL para executar a integração com Postgres.",
)

DIA_5, DIA_6, DIA_7 = datetime(2026, 11, 5, 9), datetime(2026, 11, 6, 8), datetime(2026, 11, 7, 8)


@pytest_asyncio.fixture
async def cenario():
    engine = create_async_engine(os.environ["SDF_TEST_DATABASE_URL"])
    try:
        async with engine.connect() as conexao:
            transacao = await conexao.begin()
            session = AsyncSession(bind=conexao, expire_on_commit=False)
            yield await _Cenario(session, uuid4()).montar()
            await session.close()
            await transacao.rollback()
    finally:
        await engine.dispose()


async def _marcar(cenario, *caso_ids):
    await CasoTesteRepositoryImpl(cenario.session).marcar_todos_aprovados(
        cenario.unidade_id, cenario.projeto_id, caso_ids
    )


async def _updated_at(cenario, caso_id):
    return (
        await cenario.session.execute(
            select(CasoTesteModel.updated_at).where(CasoTesteModel.id == caso_id)
        )
    ).scalar_one()


async def _all_passed(cenario, caso_id):
    return (
        await cenario.session.execute(
            select(CasoTesteModel.all_passed_em).where(CasoTesteModel.id == caso_id)
        )
    ).scalar_one()


@pytest.mark.asyncio
async def test_fecha_com_o_ultimo_pass_de_cada_device_na_data_mais_recente(cenario):
    # CA-04: PASS no S26 no dia 5 e no S25 no dia 6 fecha no dia 6.
    caso = await cenario.caso("Clock_000005")
    await cenario.importar(caso, "SDF-5", DIA_5, {cenario.s26: "PASS"})
    await cenario.importar(caso, "SDF-6", DIA_6, {cenario.s25: " pass "})

    await _marcar(cenario, caso)

    assert await _all_passed(cenario, caso) == DIA_6
    # Cálculo do sistema não conta como edição: a End date de um caso Done usa o updated_at.
    assert await _updated_at(cenario, caso) is None


@pytest.mark.asyncio
async def test_fail_antigo_corrigido_nao_impede(cenario):
    # CA-06: o FAIL do dia 5 no S25 foi corrigido pelo PASS do dia 7.
    caso = await cenario.caso("Clock_000006")
    await cenario.importar(caso, "SDF-5", DIA_5, {cenario.s26: "PASS", cenario.s25: "FAIL"})
    await cenario.importar(caso, "SDF-7", DIA_7, {cenario.s25: "PASS"})

    await _marcar(cenario, caso)

    assert await _all_passed(cenario, caso) == DIA_7


@pytest.mark.asyncio
async def test_ultimo_resultado_fail_nao_fecha(cenario):
    # CA-05 (falha).
    caso = await cenario.caso("Clock_000007")
    await cenario.importar(caso, "SDF-5", DIA_5, {cenario.s26: "PASS", cenario.s25: "PASS"})
    await cenario.importar(caso, "SDF-6", DIA_6, {cenario.s25: "FAIL"})

    await _marcar(cenario, caso)

    assert await _all_passed(cenario, caso) is None


@pytest.mark.asyncio
async def test_pass_em_um_device_so_nao_fecha(cenario):
    # CA-07 (falha): o resultado do device inativo (S24) também não conta.
    caso = await cenario.caso("Clock_000008")
    await cenario.importar(caso, "SDF-5", DIA_5, {cenario.s26: "PASS", cenario.s24: "PASS"})

    await _marcar(cenario, caso)

    assert await _all_passed(cenario, caso) is None


@pytest.mark.asyncio
async def test_data_gravada_nao_muda_com_fail_novo(cenario):
    # CA-08: a data fica fixa (RN-07), e um caso fora da lista não é tocado.
    caso, outro = await cenario.caso("Clock_000009"), await cenario.caso("Clock_000010")
    for id in (caso, outro):
        await cenario.importar(id, f"SDF-{id}", DIA_5, {cenario.s26: "PASS", cenario.s25: "PASS"})
    await _marcar(cenario, caso)
    await cenario.importar(caso, "SDF-6", DIA_6, {cenario.s25: "FAIL"})
    await cenario.importar(caso, "SDF-7", DIA_7, {cenario.s25: "PASS"})

    await _marcar(cenario, caso)

    assert await _all_passed(cenario, caso) == DIA_5
    assert await _all_passed(cenario, outro) is None


@pytest.mark.asyncio
async def test_projeto_sem_devices_nao_fecha(cenario):
    # CA-12 (falha).
    caso = await cenario.caso("Clock_000011")
    await cenario.importar(caso, "SDF-5", DIA_5, {cenario.s26: "PASS", cenario.s25: "PASS"})
    await cenario.session.execute(
        update(ProjetoModeloModel)
        .where(ProjetoModeloModel.projeto_id == cenario.projeto_id)
        .values(ativo=False)
    )

    await _marcar(cenario, caso)

    assert await _all_passed(cenario, caso) is None


@pytest.mark.asyncio
async def test_listar_todos_aprovados_usa_os_resultados_de_agora(cenario):
    # Spec 066, RN-02: CA-01 (tudo PASS), CA-03 (um device só) e CA-06 (FAIL antigo sem correção).
    fechado = await cenario.caso("Clock_000101")
    um_device = await cenario.caso("Clock_000102")
    fail_antigo = await cenario.caso("Clock_000103")
    reaberto = await cenario.caso("Clock_000104")
    await cenario.importar(fechado, "SDF-5a", DIA_5, {cenario.s26: "PASS"})
    await cenario.importar(fechado, "SDF-6a", DIA_6, {cenario.s25: "PASS"})
    await cenario.importar(um_device, "SDF-6b", DIA_6, {cenario.s25: "PASS"})
    await cenario.importar(fail_antigo, "SDF-5c", DIA_5, {cenario.s26: "FAIL"})
    await cenario.importar(fail_antigo, "SDF-6c", DIA_6, {cenario.s25: "PASS"})
    # Fechou no dia 5 e o S25 falhou no dia 6: a End date fica, mas agora não está tudo PASS.
    await cenario.importar(reaberto, "SDF-5d", DIA_5, {cenario.s26: "PASS", cenario.s25: "PASS"})
    await _marcar(cenario, reaberto)
    await cenario.importar(reaberto, "SDF-6d", DIA_6, {cenario.s25: "FAIL"})

    aprovados = await CasoTesteRepositoryImpl(cenario.session).listar_todos_aprovados(
        cenario.unidade_id, cenario.projeto_id, (fechado, um_device, fail_antigo, reaberto)
    )

    assert aprovados == {fechado}
    assert await _all_passed(cenario, reaberto) == DIA_5


@pytest.mark.asyncio
async def test_listar_todos_aprovados_sem_casos_devolve_vazio(cenario):
    assert (
        await CasoTesteRepositoryImpl(cenario.session).listar_todos_aprovados(
            cenario.unidade_id, cenario.projeto_id, ()
        )
        == set()
    )
