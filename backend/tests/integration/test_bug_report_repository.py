import os
from datetime import datetime
from uuid import uuid4

import pytest
import pytest_asyncio
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from src.domain.queries.bug_report import FiltrosBugReport
from src.domain.queries.resumo_overview import EscopoOverview
from src.infrastructure.data.models.projeto_model import ProjetoModel
from src.infrastructure.data.models.projeto_modelo_model import ProjetoModeloModel
from src.infrastructure.data.models.resultado_form_factor_model import ResultadoFormFactorModel
from src.infrastructure.repositories.bug_report_repository import BugReportRepositoryImpl
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


async def _listar(cenario, escopo=None, page=1, page_size=20, **filtros):
    return await BugReportRepositoryImpl(cenario.session).listar_falhas_abertas(
        cenario.unidade_id, escopo or EscopoOverview(), FiltrosBugReport(**filtros), page, page_size
    )


async def _outro_projeto(cenario, nome="Camera 9.5"):
    """Muda o cenário para um projeto novo do mesmo time, com o S26 vinculado."""
    projeto_id = uuid4()
    cenario.session.add(
        ProjetoModel(
            id=projeto_id,
            unidade_id=cenario.unidade_id,
            time_id=cenario.time_id,
            nome=nome,
            app="Camera",
            one_ui="9.5",
        )
    )
    await cenario.session.flush()
    cenario.session.add(
        ProjetoModeloModel(
            id=uuid4(),
            unidade_id=cenario.unidade_id,
            projeto_id=projeto_id,
            modelo_dispositivo_id=cenario.s26,
        )
    )
    await cenario.session.flush()
    cenario.projeto_id = projeto_id
    return projeto_id


@pytest.mark.asyncio
async def test_fail_mais_recente_aparece_com_device_motivo_e_responsavel(cenario):
    # CA-01: o motivo é a descrição do resultado.
    caso = await cenario.caso("Clock_000002", status="InFixes")
    await cenario.importar(caso, "SDF-5", DIA_5, {cenario.s26: "fail"})
    await cenario.session.execute(
        update(ResultadoFormFactorModel)
        .where(ResultadoFormFactorModel.unidade_id == cenario.unidade_id)
        .values(descricao="Crash ao girar a tela")
    )

    resultado = await _listar(cenario)

    assert resultado.total_count == 1
    falha = resultado.items[0]
    assert (falha.caso_teste_id, falha.tc_id, falha.status) == (caso, "Clock_000002", "InFixes")
    assert (falha.modelo_dispositivo_id, falha.modelo_nome) == (cenario.s26, "SAMSUNG S26")
    assert (falha.sdf_id, falha.motivo, falha.data_execucao) == (
        "SDF-5",
        "Crash ao girar a tela",
        DIA_5,
    )
    assert (falha.projeto_id, falha.projeto_nome) == (cenario.projeto_id, "Clock 9.5")
    assert (falha.time_id, falha.responsavel_id) == (cenario.time_id, cenario.ana)


@pytest.mark.asyncio
async def test_pass_depois_do_fail_tira_e_fail_depois_do_pass_poe(cenario):
    # CA-02 e CA-03.
    corrigido = await cenario.caso("Clock_000003")
    quebrado = await cenario.caso("Clock_000004")
    await cenario.importar(corrigido, "SDF-5", DIA_5, {cenario.s26: "FAIL"})
    await cenario.importar(corrigido, "SDF-6", DIA_6, {cenario.s26: "PASS"})
    await cenario.importar(quebrado, "SDF-5b", DIA_5, {cenario.s26: "PASS"})
    await cenario.importar(quebrado, "SDF-6b", DIA_6, {cenario.s26: "FAIL"})

    resultado = await _listar(cenario)

    assert [f.caso_teste_id for f in resultado.items] == [quebrado]


@pytest.mark.asyncio
async def test_fail_em_dois_devices_vira_duas_linhas(cenario):
    # CA-04.
    caso = await cenario.caso("Clock_000005")
    await cenario.importar(caso, "SDF-5", DIA_5, {cenario.s26: "FAIL", cenario.s25: "FAIL"})

    resultado = await _listar(cenario)

    assert sorted(f.modelo_nome for f in resultado.items) == ["SAMSUNG S25", "SAMSUNG S26"]


@pytest.mark.asyncio
@pytest.mark.parametrize("status", ["Done", "Cancelled"])
async def test_caso_done_ou_excluido_fica_fora(cenario, status):
    # CA-05 e CA-12 (falha).
    caso = await cenario.caso("Clock_000006", status=status)
    await cenario.importar(caso, "SDF-5", DIA_5, {cenario.s26: "FAIL"})

    assert (await _listar(cenario)).total_count == 0


@pytest.mark.asyncio
@pytest.mark.parametrize("status", ["Completed", "Canceled"])
async def test_projeto_encerrado_fica_fora(cenario, status):
    # CA-13 (falha).
    caso = await cenario.caso("Clock_000007")
    await cenario.importar(caso, "SDF-5", DIA_5, {cenario.s26: "FAIL"})
    await cenario.session.execute(
        update(ProjetoModel).where(ProjetoModel.id == cenario.projeto_id).values(status=status)
    )

    assert (await _listar(cenario)).total_count == 0


@pytest.mark.asyncio
async def test_na_ou_vazio_mais_recente_nao_e_falha(cenario):
    # CA-15 (falha): só FAIL conta (check não), e um N/A depois do FAIL tira a falha.
    caso = await cenario.caso("Clock_000008")
    await cenario.importar(caso, "SDF-5", DIA_5, {cenario.s26: "FAIL", cenario.s25: "check"})
    await cenario.importar(caso, "SDF-6", DIA_6, {cenario.s26: "N/A"})

    assert (await _listar(cenario)).total_count == 0


@pytest.mark.asyncio
async def test_device_desvinculado_do_projeto_nao_conta(cenario):
    # Mesma regra da General Results: S24 está com o vínculo inativo e S99 sem vínculo.
    caso = await cenario.caso("Clock_000009")
    await cenario.importar(caso, "SDF-5", DIA_5, {cenario.s24: "FAIL", cenario.s99: "FAIL"})

    assert (await _listar(cenario)).total_count == 0


@pytest.mark.asyncio
async def test_pagina_de_20_na_ordem_da_execucao_mais_recente(cenario):
    # CA-06.
    for numero in range(25):
        caso = await cenario.caso(f"Clock_{numero:06}")
        dia = DIA_7 if numero == 24 else DIA_5
        await cenario.importar(caso, f"SDF-{numero}", dia, {cenario.s26: "FAIL"})

    primeira = await _listar(cenario)
    segunda = await _listar(cenario, page=2)

    assert (primeira.total_count, len(primeira.items), len(segunda.items)) == (25, 20, 5)
    assert primeira.items[0].tc_id == "Clock_000024"


@pytest.mark.asyncio
async def test_filtros_por_projeto_device_e_responsavel(cenario):
    # CA-07: e os filtros de device e responsável (RN-07).
    clock = cenario.projeto_id
    caso_clock = await cenario.caso("Clock_000010", responsavel_id=cenario.bia)
    await cenario.importar(caso_clock, "SDF-5", DIA_5, {cenario.s26: "FAIL", cenario.s25: "FAIL"})
    camera = await _outro_projeto(cenario)
    caso_camera = await cenario.caso("Camera_000001")
    await cenario.importar(caso_camera, "SDF-6", DIA_6, {cenario.s26: "FAIL"})

    por_projeto = await _listar(cenario, projeto_id=clock)
    por_device = await _listar(cenario, modelo_dispositivo_id=cenario.s25)
    de_camera = await _listar(cenario, projeto_id=camera)

    assert {f.caso_teste_id for f in por_projeto.items} == {caso_clock}
    assert [(f.caso_teste_id, f.modelo_nome) for f in por_device.items] == [
        (caso_clock, "SAMSUNG S25")
    ]
    assert [f.projeto_nome for f in de_camera.items] == ["Camera 9.5"]


@pytest.mark.asyncio
async def test_escopo_por_time_e_por_pessoa(cenario):
    # CA-10: o dev vê só os casos em que é responsável ou backup.
    da_bia = await cenario.caso("Clock_000011", responsavel_id=cenario.bia)
    backup_bia = await cenario.caso("Clock_000012", backup_id=cenario.bia)
    da_ana = await cenario.caso("Clock_000013")
    for caso in (da_bia, backup_bia, da_ana):
        await cenario.importar(caso, f"SDF-{caso}", DIA_5, {cenario.s26: "FAIL"})

    bia = await _listar(cenario, EscopoOverview(pessoa_id=cenario.bia))
    outro_time = await _listar(cenario, EscopoOverview(time_ids=(uuid4(),)))
    time_certo = await _listar(cenario, EscopoOverview(time_ids=(cenario.time_id,)))

    assert {f.caso_teste_id for f in bia.items} == {da_bia, backup_bia}
    assert outro_time.total_count == 0
    assert time_certo.total_count == 3
