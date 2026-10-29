import os
from datetime import date, datetime, timedelta
from uuid import uuid4

import pytest
import pytest_asyncio
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from src.application.validators.semana import intervalo_semana_iso
from src.domain.entities.execucao_sdf import ExecucaoSdf
from src.domain.entities.resultado_form_factor import ResultadoFormFactor
from src.infrastructure.data.models.usuario_model import UsuarioModel
from src.infrastructure.repositories.execucao_sdf_repository import ExecucaoSdfRepositoryImpl
from src.infrastructure.repositories.historico_form_factor_repository import (
    HistoricoFormFactorRepositoryImpl,
)
from src.infrastructure.repositories.resultado_form_factor_repository import (
    ResultadoFormFactorRepositoryImpl,
)
from tests.integration.test_resultado_form_factor_repository import _Cenario

pytestmark = pytest.mark.skipif(
    not os.environ.get("SDF_TEST_DATABASE_URL"),
    reason="Defina SDF_TEST_DATABASE_URL para executar a integração com Postgres.",
)

INICIO = datetime(2026, 10, 1, 12, 0)  # UTC, sem fuso, como a importação grava


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


def _repo(cenario):
    return HistoricoFormFactorRepositoryImpl(cenario.session)


async def _manual(cenario, caso_id, data, resultados, sdf_id=None):
    """Execução manual avulsa (sem rodada e sem SDF ID), como o registro manual antigo."""
    execucao = ExecucaoSdf(cenario.unidade_id, None, caso_id, sdf_id, data, "9.5", origem="MANUAL")
    await ExecucaoSdfRepositoryImpl(cenario.session).adicionar(execucao)
    await cenario.session.flush()
    repo = ResultadoFormFactorRepositoryImpl(cenario.session)
    for modelo_id, valor in resultados.items():
        await repo.adicionar(ResultadoFormFactor(cenario.unidade_id, execucao.id, modelo_id, valor))
    await cenario.session.flush()
    return execucao


@pytest.mark.asyncio
async def test_datas_sao_as_7_mais_recentes_da_mais_nova_para_a_mais_antiga(cenario):
    caso = await cenario.caso("Clock_001")
    for dia in range(10):
        await cenario.importar(
            caso, f"SDF-{dia}", INICIO + timedelta(days=dia), {cenario.s26: "PASS"}
        )

    datas = await _repo(cenario).listar_datas(cenario.unidade_id, cenario.projeto_id, [caso], "UTC")

    assert datas == tuple(date(2026, 10, 10) - timedelta(days=n) for n in range(7))


@pytest.mark.asyncio
async def test_datas_respeitam_o_periodo_e_o_fuso(cenario):
    caso = await cenario.caso("Clock_001")
    for dia in range(10):
        await cenario.importar(
            caso, f"SDF-{dia}", INICIO + timedelta(days=dia), {cenario.s26: "PASS"}
        )
    # 02h UTC do dia 12 ainda é dia 11 em Manaus (UTC-4).
    await cenario.importar(
        caso, "SDF-MADRUGADA", datetime(2026, 10, 12, 2, 0), {cenario.s25: "FAIL"}
    )
    repo = _repo(cenario)
    inicio, fim = intervalo_semana_iso("2026-W40", "UTC")  # 28/09 a 04/10

    na_semana = await repo.listar_datas(
        cenario.unidade_id, cenario.projeto_id, [caso], "UTC", inicio, fim
    )
    em_utc = await repo.listar_datas(
        cenario.unidade_id, cenario.projeto_id, [caso], "UTC", limite=1
    )
    em_manaus = await repo.listar_datas(
        cenario.unidade_id, cenario.projeto_id, [caso], "America/Manaus", limite=1
    )

    assert na_semana == (date(2026, 10, 4), date(2026, 10, 3), date(2026, 10, 2), date(2026, 10, 1))
    assert em_utc == (date(2026, 10, 12),)
    assert em_manaus == (date(2026, 10, 11),)


@pytest.mark.asyncio
async def test_resultados_por_dia_e_modelo_com_sdf_id_e_origem(cenario):
    caso, outro = await cenario.caso("Clock_001"), await cenario.caso("Clock_002")
    # S24 tem vínculo inativo e S99 não é do projeto: não entram.
    await cenario.importar(
        caso,
        "SDF-1",
        INICIO,
        {cenario.s26: "PASS", cenario.s25: "FAIL", cenario.s24: "PASS", cenario.s99: "PASS"},
    )
    manual = await _manual(cenario, caso, INICIO + timedelta(hours=3), {cenario.s26: "FAIL"})
    await cenario.importar(outro, "SDF-2", INICIO + timedelta(days=1), {cenario.s26: "PASS"})
    repo = _repo(cenario)

    linhas = await repo.listar_resultados(
        cenario.unidade_id, cenario.projeto_id, [caso], "UTC", [date(2026, 10, 1)]
    )

    assert sorted(
        (linha.modelo_dispositivo_id, linha.resultado, linha.origem, linha.sdf_id)
        for linha in linhas
    ) == sorted(
        [
            (cenario.s26, "PASS", "SDF", "SDF-1"),
            (cenario.s25, "FAIL", "SDF", "SDF-1"),
            (cenario.s26, "FAIL", "MANUAL", None),
        ]
    )
    assert {linha.dia for linha in linhas} == {date(2026, 10, 1)}
    assert next(linha for linha in linhas if linha.origem == "MANUAL").execucao_id == manual.id
    assert (
        await repo.listar_resultados(cenario.unidade_id, cenario.projeto_id, [caso], "UTC", [])
        == ()
    )
    assert await repo.listar_resultados(uuid4(), cenario.projeto_id, [caso], "UTC") == ()
    # Sem datas, todas as do caso (resumo de execuções).
    todas = await repo.listar_resultados(cenario.unidade_id, cenario.projeto_id, [outro], "UTC")
    assert [(linha.dia, linha.sdf_id) for linha in todas] == [(date(2026, 10, 2), "SDF-2")]


@pytest.mark.asyncio
async def test_modelos_da_ultima_execucao_de_cada_caso(cenario):
    caso, sem_execucao = await cenario.caso("Clock_001"), await cenario.caso("Clock_002")
    await cenario.importar(caso, "SDF-1", INICIO, {cenario.s26: "PASS"})
    await cenario.importar(
        caso, "SDF-2", INICIO + timedelta(days=2), {cenario.s25: "FAIL", cenario.s26: "PASS"}
    )

    modelos = await _repo(cenario).listar_modelos_da_ultima_execucao(
        cenario.unidade_id, cenario.projeto_id, [caso, sem_execucao]
    )

    assert set(modelos[caso]) == {cenario.s25, cenario.s26}
    assert sem_execucao not in modelos


@pytest.mark.asyncio
async def test_casos_com_busca_filtros_e_periodo(cenario):
    await cenario.session.execute(
        update(UsuarioModel).where(UsuarioModel.id == cenario.ana).values(user_id="ANA-001")
    )
    caso_ana = await cenario.caso("Clock_001", responsavel_id=cenario.ana)
    caso_bia = await cenario.caso("Clock_002", responsavel_id=cenario.bia)
    sem_execucao = await cenario.caso("Clock_003", responsavel_id=cenario.bia)
    await cenario.importar(caso_ana, "SDF-ALFA", INICIO, {cenario.s26: "PASS"})
    await cenario.importar(caso_bia, "SDF-BETA", INICIO + timedelta(days=8), {cenario.s25: "FAIL"})
    repo = _repo(cenario)

    async def ids(**filtros):
        casos = await repo.listar_casos(cenario.unidade_id, cenario.projeto_id, **filtros)
        return [caso.caso_teste_id for caso in casos]

    todos = await repo.listar_casos(cenario.unidade_id, cenario.projeto_id)
    assert [caso.tc_id for caso in todos] == ["Clock_001", "Clock_002", "Clock_003"]
    assert todos[0].responsavel_identificador == "ANA-001"
    assert await ids(busca="ana-0") == [caso_ana]
    assert await ids(busca="beta") == [caso_bia]
    assert await ids(busca="S26") == [caso_ana]
    assert await ids(tc_id="003") == [sem_execucao]
    assert await ids(modelo_dispositivo_id=cenario.s25) == [caso_bia]
    inicio, fim = intervalo_semana_iso("2026-W40", "UTC")
    assert await ids(inicio=inicio, fim=fim) == [caso_ana]
    assert await ids(busca="nada-parecido") == []
    assert await repo.listar_casos(uuid4(), cenario.projeto_id) == ()


@pytest.mark.asyncio
async def test_obter_caso_com_projeto_e_tester_so_na_unidade(cenario):
    await cenario.session.execute(
        update(UsuarioModel).where(UsuarioModel.id == cenario.ana).values(user_id="ANA-001")
    )
    caso_id = await cenario.caso("Clock_001", responsavel_id=cenario.ana)
    repo = _repo(cenario)

    caso = await repo.obter_caso(cenario.unidade_id, caso_id)

    assert (caso.projeto_id, caso.tc_id, caso.responsavel_identificador) == (
        cenario.projeto_id,
        "Clock_001",
        "ANA-001",
    )
    assert await repo.obter_caso(uuid4(), caso_id) is None
    assert await repo.obter_caso(cenario.unidade_id, uuid4()) is None


@pytest.mark.asyncio
async def test_filtro_e_periodo_casam_com_a_mesma_execucao_e_datas_seguem_o_modelo(cenario):
    caso = await cenario.caso("Clock_001")
    # S26 só fora da semana 40; S25 dentro dela.
    await cenario.importar(caso, "SDF-ANTIGO", INICIO - timedelta(days=20), {cenario.s26: "PASS"})
    await cenario.importar(caso, "SDF-NOVO", INICIO, {cenario.s25: "FAIL"})
    await cenario.importar(caso, "SDF-RECENTE", INICIO + timedelta(days=5), {cenario.s25: "PASS"})
    repo = _repo(cenario)
    inicio, fim = intervalo_semana_iso("2026-W40", "UTC")

    async def ids(**filtros):
        casos = await repo.listar_casos(cenario.unidade_id, cenario.projeto_id, **filtros)
        return [item.caso_teste_id for item in casos]

    assert await ids(modelo_dispositivo_id=cenario.s26, inicio=inicio, fim=fim) == []
    assert await ids(busca="SDF-ANTIGO", inicio=inicio, fim=fim) == []
    assert await ids(modelo_dispositivo_id=cenario.s25, inicio=inicio, fim=fim) == [caso]
    datas_s26 = await repo.listar_datas(
        cenario.unidade_id, cenario.projeto_id, [caso], "UTC", modelo_dispositivo_id=cenario.s26
    )
    assert datas_s26 == ((INICIO - timedelta(days=20)).date(),)
