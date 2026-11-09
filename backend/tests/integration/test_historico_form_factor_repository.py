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
from src.domain.queries.historico_form_factor import FiltrosCasoHistorico
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


async def _listar(repo, cenario, page=1, page_size=20, **filtros):
    return await repo.listar_casos(
        cenario.unidade_id, cenario.projeto_id, FiltrosCasoHistorico(**filtros), page, page_size
    )


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
async def test_datas_sao_as_5_mais_recentes_da_mais_nova_para_a_mais_antiga(cenario):
    caso = await cenario.caso("Clock_001")
    for dia in range(10):
        await cenario.importar(
            caso, f"SDF-{dia}", INICIO + timedelta(days=dia), {cenario.s26: "PASS"}
        )

    datas = await _repo(cenario).listar_datas(
        cenario.unidade_id, cenario.projeto_id, FiltrosCasoHistorico(), "UTC", limite=5
    )

    assert datas == tuple(date(2026, 10, 10) - timedelta(days=n) for n in range(5))


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

    sem_filtro = FiltrosCasoHistorico()

    na_semana = await repo.listar_datas(
        cenario.unidade_id,
        cenario.projeto_id,
        FiltrosCasoHistorico(inicio=inicio, fim=fim),
        "UTC",
        limite=5,
    )
    em_utc = await repo.listar_datas(
        cenario.unidade_id, cenario.projeto_id, sem_filtro, "UTC", limite=1
    )
    em_manaus = await repo.listar_datas(
        cenario.unidade_id, cenario.projeto_id, sem_filtro, "America/Manaus", limite=1
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
async def test_ultimo_sdf_de_cada_modelo_em_qualquer_data(cenario):
    caso, sem_execucao = await cenario.caso("Clock_001"), await cenario.caso("Clock_002")
    # S25 só tem execução antiga, fora das 5 datas mais recentes; S26 tem uma nova.
    await cenario.importar(caso, "SDF-ANTIGO", INICIO, {cenario.s25: "FAIL", cenario.s26: "PASS"})
    for dia in range(1, 7):
        await cenario.importar(
            caso, f"SDF-{dia}", INICIO + timedelta(days=10 + dia), {cenario.s26: "PASS"}
        )

    ultimos = await _repo(cenario).listar_ultimo_sdf_por_modelo(
        cenario.unidade_id, cenario.projeto_id, [caso, sem_execucao]
    )

    assert ultimos[caso] == {cenario.s25: "SDF-ANTIGO", cenario.s26: "SDF-6"}
    assert sem_execucao not in ultimos
    assert (
        await _repo(cenario).listar_ultimo_sdf_por_modelo(uuid4(), cenario.projeto_id, [caso]) == {}
    )


@pytest.mark.asyncio
async def test_casos_com_filtros_de_coluna_e_periodo(cenario):
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
        casos = await _listar(repo, cenario, **filtros)
        return [caso.caso_teste_id for caso in casos.items]

    todos = (await _listar(repo, cenario)).items
    assert [caso.tc_id for caso in todos] == ["Clock_001", "Clock_002", "Clock_003"]
    assert todos[0].responsavel_identificador == "ANA-001"
    assert await ids(responsavel="ana-0") == [caso_ana]
    assert await ids(sdf_id="beta") == [caso_bia]
    assert await ids(tc_id="003") == [sem_execucao]
    assert await ids(modelo_dispositivo_id=cenario.s25) == [caso_bia]
    inicio, fim = intervalo_semana_iso("2026-W40", "UTC")
    assert await ids(inicio=inicio, fim=fim) == [caso_ana]
    assert await ids(responsavel="nada-parecido") == []
    assert await ids(sdf_id="nada-parecido") == []
    outra_unidade = await repo.listar_casos(
        uuid4(), cenario.projeto_id, FiltrosCasoHistorico(), 1, 20
    )
    assert (outra_unidade.items, outra_unidade.total_count) == ([], 0)


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
        casos = await _listar(repo, cenario, **filtros)
        return [item.caso_teste_id for item in casos.items]

    assert await ids(modelo_dispositivo_id=cenario.s26, inicio=inicio, fim=fim) == []
    assert await ids(sdf_id="SDF-ANTIGO", inicio=inicio, fim=fim) == []
    assert await ids(modelo_dispositivo_id=cenario.s25, inicio=inicio, fim=fim) == [caso]
    datas_s26 = await repo.listar_datas(
        cenario.unidade_id,
        cenario.projeto_id,
        FiltrosCasoHistorico(modelo_dispositivo_id=cenario.s26),
        "UTC",
        limite=5,
    )
    assert datas_s26 == ((INICIO - timedelta(days=20)).date(),)


@pytest.mark.asyncio
async def test_casos_paginados_por_tc_id_com_total(cenario):
    for numero in range(45, 0, -1):  # criados fora de ordem: a página segue o TC ID
        await cenario.caso(f"Clock_{numero:03d}")
    repo = _repo(cenario)

    primeira = await _listar(repo, cenario, page=1, page_size=20)
    ultima = await _listar(repo, cenario, page=3, page_size=20)
    alem = await _listar(repo, cenario, page=4, page_size=20)

    assert [caso.tc_id for caso in primeira.items] == [f"Clock_{n:03d}" for n in range(1, 21)]
    assert (primeira.total_count, primeira.total_pages) == (45, 3)
    assert [caso.tc_id for caso in ultima.items] == [f"Clock_{n:03d}" for n in range(41, 46)]
    # Página além da última (CA-09): vazia, com o total correto.
    assert (alem.items, alem.total_count) == ([], 45)


@pytest.mark.asyncio
async def test_datas_consideram_os_casos_de_todas_as_paginas(cenario):
    primeiro = await cenario.caso("Clock_001")
    ultimo = await cenario.caso("Clock_099")
    fora_do_filtro = await cenario.caso("Other_001")
    await cenario.importar(primeiro, "SDF-1", INICIO, {cenario.s26: "PASS"})
    # Só o último caso, que cai noutra página com `page_size` 1, tem execução nesta data (CA-03).
    await cenario.importar(ultimo, "SDF-2", INICIO + timedelta(days=3), {cenario.s26: "FAIL"})
    await cenario.importar(
        fora_do_filtro, "SDF-3", INICIO + timedelta(days=5), {cenario.s26: "PASS"}
    )
    repo = _repo(cenario)
    filtros = FiltrosCasoHistorico(tc_id="Clock")

    pagina = await repo.listar_casos(cenario.unidade_id, cenario.projeto_id, filtros, 1, 1)
    datas = await repo.listar_datas(
        cenario.unidade_id, cenario.projeto_id, filtros, "UTC", limite=5
    )

    assert [caso.caso_teste_id for caso in pagina.items] == [primeiro]
    # A data do caso fora do filtro de TC ID não entra.
    assert datas == (date(2026, 10, 4), date(2026, 10, 1))


@pytest.mark.asyncio
async def test_associado_a_traz_os_casos_em_que_a_pessoa_e_dona_ou_backup(cenario):
    # Spec 068, CA-02 e CA-04.
    dono = await cenario.caso("Clock_001", cenario.bia)
    backup = await cenario.caso("Clock_002", cenario.ana, backup_id=cenario.bia)
    await cenario.caso("Clock_003", cenario.ana)

    da_bia = await _listar(_repo(cenario), cenario, associado_a=cenario.bia)
    todos = await _listar(_repo(cenario), cenario)

    assert [caso.caso_teste_id for caso in da_bia.items] == [dono, backup]
    assert da_bia.total_count == 2
    assert todos.total_count == 3
    assert next(c for c in da_bia.items if c.caso_teste_id == backup).backup_id == cenario.bia


@pytest.mark.asyncio
async def test_falha_associado_a_sem_casos_da_pessoa_nao_traz_nada(cenario):
    # CA-03: os casos dos colegas não aparecem nem pelo filtro de Assignee.
    await cenario.caso("Clock_001", cenario.ana)

    pagina = await _listar(_repo(cenario), cenario, associado_a=cenario.bia, responsavel="Ana")

    assert (pagina.items, pagina.total_count) == ([], 0)


@pytest.mark.asyncio
async def test_rodada_esperando_resultado_vem_no_caso(cenario):
    # CA-07 e CA-08: só a rodada atual sem resultados.
    pendente = await cenario.caso("Clock_001")
    registrado = await cenario.caso("Clock_002")
    rodada, _ = await cenario.rodada(pendente, "SDF-1", INICIO)
    _, execucao = await cenario.rodada(registrado, "SDF-2", INICIO)
    await cenario.registrar(execucao, {cenario.s26: "PASS"})

    pagina = await _listar(_repo(cenario), cenario)

    assert {caso.tc_id: caso.rodada_pendente_id for caso in pagina.items} == {
        "Clock_001": rodada.id,
        "Clock_002": None,
    }
