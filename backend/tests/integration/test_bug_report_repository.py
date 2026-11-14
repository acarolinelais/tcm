import os
from datetime import datetime
from uuid import uuid4

import pytest
import pytest_asyncio
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from src.domain.entities.caso_teste import StatusCasoTeste
from src.domain.entities.importacao_sdf_status import ImportacaoSdfStatus
from src.domain.queries.bug_report import FiltrosBugReport
from src.domain.queries.resumo_overview import EscopoOverview
from src.infrastructure.data.models.caso_teste_model import CasoTesteModel
from src.infrastructure.data.models.execucao_sdf_model import ExecucaoSdfModel
from src.infrastructure.data.models.importacao_sdf_model import ImportacaoSdfModel
from src.infrastructure.data.models.projeto_model import ProjetoModel
from src.infrastructure.data.models.resultado_form_factor_model import ResultadoFormFactorModel
from src.infrastructure.data.models.usuario_model import UsuarioModel
from src.infrastructure.repositories.bug_report_repository import BugReportRepositoryImpl
from src.infrastructure.repositories.importacao_sdf_status_repository import (
    ImportacaoSdfStatusRepositoryImpl,
)
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
    filtros.setdefault("projeto_id", cenario.projeto_id)
    return await BugReportRepositoryImpl(cenario.session).listar_casos_com_falhas(
        cenario.unidade_id, escopo or EscopoOverview(), FiltrosBugReport(**filtros), page, page_size
    )


async def _gravada_em(cenario, importacao, quando):
    """Na mesma transação tudo teria o mesmo now(): fixa quando a importação foi gravada."""
    for model, coluna in ((ImportacaoSdfModel, "id"), (ExecucaoSdfModel, "importacao_sdf_id")):
        await cenario.session.execute(
            update(model).where(getattr(model, coluna) == importacao.id).values(created_at=quando)
        )


async def _concluir_correcao(cenario, caso, importacao):
    await ImportacaoSdfStatusRepositoryImpl(cenario.session).adicionar(
        ImportacaoSdfStatus(
            cenario.unidade_id, importacao.id, caso, StatusCasoTeste.DONE, concluiu_correcao=True
        )
    )
    await cenario.session.flush()


@pytest.mark.asyncio
async def test_falha_aparece_com_device_sdf_data_descricao_e_dono(cenario):
    # Spec 072, CA-01: To-Do também entra.
    caso = await cenario.caso("Clock_000002", status="To-Do")
    await cenario.importar(caso, "SDF-5", DIA_5, {cenario.s26: "fail"})
    await cenario.session.execute(
        update(ResultadoFormFactorModel)
        .where(ResultadoFormFactorModel.unidade_id == cenario.unidade_id)
        .values(descricao="Crash ao girar a tela")
    )

    resultado = await _listar(cenario)

    assert resultado.total_count == 1
    linha = resultado.items[0]
    assert (linha.caso_teste_id, linha.tc_id, linha.status) == (caso, "Clock_000002", "To-Do")
    assert (linha.responsavel_id, linha.dev_fix_id, linha.time_id) == (
        cenario.ana,
        None,
        cenario.time_id,
    )
    falha = linha.falhas[0]
    assert (falha.modelo_nome, falha.sdf_id, falha.data_execucao) == ("SAMSUNG S26", "SDF-5", DIA_5)
    assert (falha.resultado, falha.descricao) == ("fail", "Crash ao girar a tela")


@pytest.mark.asyncio
async def test_pass_depois_nao_tira_a_falha(cenario):
    # Spec 072, CA-02.
    caso = await cenario.caso("Clock_000003")
    await cenario.importar(caso, "SDF-5", DIA_5, {cenario.s26: "FAIL"})
    await cenario.importar(caso, "SDF-6", DIA_6, {cenario.s26: "PASS"})

    resultado = await _listar(cenario)

    assert [f.data_execucao for f in resultado.items[0].falhas] == [DIA_5]


@pytest.mark.asyncio
async def test_exception_e_none_sao_falha_e_na_ou_check_nao(cenario):
    # Spec 072, CA-03 e CA-04 (falha).
    com_falha = await cenario.caso("Clock_000004")
    sem_falha = await cenario.caso("Clock_000005")
    await cenario.importar(
        com_falha, "SDF-5", DIA_5, {cenario.s26: "EXCEPTION", cenario.s25: "None"}
    )
    await cenario.importar(sem_falha, "SDF-5b", DIA_5, {cenario.s26: "N/A", cenario.s25: " check "})
    await cenario.importar(sem_falha, "SDF-6b", DIA_6, {cenario.s26: "NA", cenario.s25: "PASS"})

    resultado = await _listar(cenario)

    assert [linha.caso_teste_id for linha in resultado.items] == [com_falha]
    assert sorted(f.resultado for f in resultado.items[0].falhas) == ["EXCEPTION", "None"]


@pytest.mark.asyncio
async def test_falhas_repetidas_viram_itens_do_mais_recente_ao_mais_antigo(cenario):
    # Spec 072, CA-05: uma linha por caso; a primeira falha é a mais recente.
    caso = await cenario.caso("Clock_000006")
    for numero, dia in enumerate((DIA_5, DIA_6, DIA_7)):
        await cenario.importar(caso, f"SDF-{numero}", dia, {cenario.s26: "FAIL"})

    resultado = await _listar(cenario)

    assert resultado.total_count == 1
    assert [f.data_execucao for f in resultado.items[0].falhas] == [DIA_7, DIA_6, DIA_5]


@pytest.mark.asyncio
async def test_correcao_concluida_tira_as_falhas_ate_ela_e_desfazer_traz_de_volta(cenario):
    # Spec 072, CA-15, CA-16 e o corte pela importação ativa (RN-08).
    corrigido = await cenario.caso("Clock_000007")
    sem_correcao = await cenario.caso("Clock_000008")
    antiga = await cenario.importar(corrigido, "SDF-5", DIA_5, {cenario.s26: "FAIL"})
    await _gravada_em(cenario, antiga, datetime(2026, 11, 5, 10))
    await cenario.importar(sem_correcao, "SDF-5b", DIA_5, {cenario.s26: "FAIL"})
    fechou = await cenario.importar(corrigido, "SDF-6", DIA_6, {cenario.s26: "PASS"})
    await _gravada_em(cenario, fechou, datetime(2026, 11, 6, 10))
    await _concluir_correcao(cenario, corrigido, fechou)

    depois_da_correcao = await _listar(cenario)
    await cenario.session.execute(
        update(ImportacaoSdfModel).where(ImportacaoSdfModel.id == fechou.id).values(ativo=False)
    )
    depois_de_desfazer = await _listar(cenario)

    assert [linha.caso_teste_id for linha in depois_da_correcao.items] == [sem_correcao]
    assert {linha.caso_teste_id for linha in depois_de_desfazer.items} == {
        corrigido,
        sem_correcao,
    }


@pytest.mark.asyncio
async def test_falha_nova_depois_da_correcao_volta_para_a_pagina(cenario):
    caso = await cenario.caso("Clock_000009")
    fechou = await cenario.importar(caso, "SDF-5", DIA_5, {cenario.s26: "PASS"})
    await _gravada_em(cenario, fechou, datetime(2026, 11, 5, 10))
    await _concluir_correcao(cenario, caso, fechou)
    nova = await cenario.importar(caso, "SDF-7", DIA_7, {cenario.s26: "FAIL"})
    await _gravada_em(cenario, nova, datetime(2026, 11, 7, 10))

    resultado = await _listar(cenario)

    assert [f.data_execucao for f in resultado.items[0].falhas] == [DIA_7]


@pytest.mark.asyncio
async def test_done_continua_e_cancelado_ou_projeto_encerrado_saem(cenario):
    # Spec 072, RN-06 e CA-19 (falha).
    done = await cenario.caso("Clock_000010", status="Done")
    cancelado = await cenario.caso("Clock_000011", status="Cancelled")
    for caso in (done, cancelado):
        await cenario.importar(caso, f"SDF-{caso}", DIA_5, {cenario.s26: "FAIL"})

    abertos = await _listar(cenario)
    await cenario.session.execute(
        update(ProjetoModel).where(ProjetoModel.id == cenario.projeto_id).values(status="Completed")
    )
    encerrado = await _listar(cenario)

    assert [linha.caso_teste_id for linha in abertos.items] == [done]
    assert encerrado.total_count == 0


@pytest.mark.asyncio
async def test_filtros_de_projeto_device_dia_dev_fix_e_dono(cenario):
    # Spec 072, CA-08, CA-09 e RN-14.
    caso = await cenario.caso("Clock_000012", responsavel_id=cenario.bia)
    await cenario.importar(caso, "SDF-5", DIA_5, {cenario.s26: "FAIL", cenario.s25: "FAIL"})
    await cenario.importar(caso, "SDF-6", DIA_6, {cenario.s26: "FAIL"})
    await cenario.session.execute(
        update(CasoTesteModel).where(CasoTesteModel.id == caso).values(dev_fix_id=cenario.ana)
    )

    outro_projeto = await _listar(cenario, projeto_id=uuid4())
    do_s25 = await _listar(cenario, modelo_dispositivo_id=cenario.s25)
    do_dia_6 = await _listar(cenario, inicio=datetime(2026, 11, 6), fim=datetime(2026, 11, 7))

    assert outro_projeto.total_count == 0
    assert [f.modelo_nome for f in do_s25.items[0].falhas] == ["SAMSUNG S25"]
    assert [f.data_execucao for f in do_dia_6.items[0].falhas] == [DIA_6]
    assert do_dia_6.items[0].dev_fix_id == cenario.ana


@pytest.mark.asyncio
async def test_filtros_de_texto_tratam_porcento_e_sublinhado_como_texto(cenario):
    caso = await cenario.caso("Clock_000020", responsavel_id=cenario.bia)
    await cenario.importar(caso, "SDF-5", DIA_5, {cenario.s26: "FAIL"})
    await cenario.session.execute(
        update(CasoTesteModel).where(CasoTesteModel.id == caso).values(dev_fix_id=cenario.ana)
    )
    for id_, user_id in ((cenario.ana, "ana.silva"), (cenario.bia, "bia.souza")):
        await cenario.session.execute(
            update(UsuarioModel).where(UsuarioModel.id == id_).values(user_id=user_id)
        )

    achou = await _listar(cenario, dev_fix="ANA", responsavel="bia")
    curinga_porcento = await _listar(cenario, dev_fix="%")
    curinga_sublinhado = await _listar(cenario, responsavel="b_a")

    assert achou.total_count == 1
    # Sem o escape, "%" casaria com qualquer Dev Fix e "b_a" com "bia".
    assert (curinga_porcento.total_count, curinga_sublinhado.total_count) == (0, 0)


@pytest.mark.asyncio
async def test_pagina_de_20_casos_na_ordem_da_falha_mais_recente(cenario):
    # Spec 072, CA-20.
    for numero in range(25):
        caso = await cenario.caso(f"Clock_{numero:06}")
        dia = DIA_7 if numero == 24 else DIA_5
        await cenario.importar(
            caso, f"SDF-{numero}", dia, {cenario.s26: "FAIL", cenario.s25: "FAIL"}
        )

    primeira = await _listar(cenario)
    segunda = await _listar(cenario, page=2)

    assert (primeira.total_count, len(primeira.items), len(segunda.items)) == (25, 20, 5)
    assert primeira.items[0].tc_id == "Clock_000024"


@pytest.mark.asyncio
async def test_dev_ve_dono_backup_e_dev_fix(cenario):
    # Spec 072, CA-18.
    da_bia = await cenario.caso("Clock_000013", responsavel_id=cenario.bia)
    backup_bia = await cenario.caso("Clock_000014", backup_id=cenario.bia)
    fix_da_bia = await cenario.caso("Clock_000015")
    da_ana = await cenario.caso("Clock_000016")
    await cenario.session.execute(
        update(CasoTesteModel).where(CasoTesteModel.id == fix_da_bia).values(dev_fix_id=cenario.bia)
    )
    for caso in (da_bia, backup_bia, fix_da_bia, da_ana):
        await cenario.importar(caso, f"SDF-{caso}", DIA_5, {cenario.s26: "FAIL"})

    bia = await _listar(cenario, EscopoOverview(pessoa_id=cenario.bia))
    outro_time = await _listar(cenario, EscopoOverview(time_ids=(uuid4(),)))

    assert {linha.caso_teste_id for linha in bia.items} == {da_bia, backup_bia, fix_da_bia}
    assert outro_time.total_count == 0


async def _em_correcao(cenario, tc_id, *, status="InFixes", tentativa=1, dev_fix=None):
    caso = await cenario.caso(tc_id)
    await cenario.importar(caso, f"SDF-{tc_id}", DIA_5, {cenario.s26: "FAIL"})
    await cenario.session.execute(
        update(CasoTesteModel)
        .where(CasoTesteModel.id == caso)
        .values(status=status, tentativa_correcao=tentativa, dev_fix_id=dev_fix)
    )
    return caso


async def _my_fixes(cenario, pessoa, **filtros):
    return await BugReportRepositoryImpl(cenario.session).listar_casos_com_falhas(
        cenario.unidade_id,
        EscopoOverview(),
        FiltrosBugReport(
            projeto_id=cenario.projeto_id, em_correcao=True, corretor_id=pessoa, **filtros
        ),
        1,
        20,
    )


# Spec 073: a My Fixes é a SDF Failures do corretor, só com os casos em correção.
@pytest.mark.asyncio
async def test_caso_em_correcao_sem_dev_fix_aparece_para_o_responsavel(cenario):
    # CA-01: a responsável (ana) é a corretora enquanto não há Dev Fix.
    caso = await _em_correcao(cenario, "Clock_000001")

    resultado = await _my_fixes(cenario, cenario.ana)

    assert [linha.caso_teste_id for linha in resultado.items] == [caso]
    assert resultado.items[0].tentativa_correcao == 1


@pytest.mark.asyncio
async def test_com_dev_fix_o_caso_sai_do_responsavel_e_vai_para_o_dev_fix(cenario):
    # CA-02 e CA-07.
    caso = await _em_correcao(cenario, "Clock_000001", dev_fix=cenario.bia)

    assert (await _my_fixes(cenario, cenario.ana)).items == []
    assert [linha.caso_teste_id for linha in (await _my_fixes(cenario, cenario.bia)).items] == [
        caso
    ]


@pytest.mark.asyncio
async def test_done_ou_sem_tentativa_nao_esta_em_correcao(cenario):
    # CA-05: Done sai; um caso com falha mas que nunca voltou para In Fixes também não entra.
    await _em_correcao(cenario, "Clock_000001", status="Done")
    await _em_correcao(cenario, "Clock_000002", status="InProgress", tentativa=0)

    assert (await _my_fixes(cenario, cenario.ana)).items == []


@pytest.mark.asyncio
async def test_gestao_ve_os_casos_em_correcao_de_todos_do_escopo(cenario):
    # Sem corretor_id (admin, gerente e KP não corrigem casos), entram os casos de qualquer pessoa,
    # mas só os em correção.
    da_ana = await _em_correcao(cenario, "Clock_000001")
    da_bia = await _em_correcao(cenario, "Clock_000002", dev_fix=cenario.bia)
    await _em_correcao(cenario, "Clock_000003", status="Done")

    todos = await _my_fixes(cenario, None)
    outro_time = await BugReportRepositoryImpl(cenario.session).listar_casos_com_falhas(
        cenario.unidade_id,
        EscopoOverview(time_ids=(uuid4(),)),
        FiltrosBugReport(projeto_id=cenario.projeto_id, em_correcao=True),
        1,
        20,
    )

    assert {linha.caso_teste_id for linha in todos.items} == {da_ana, da_bia}
    assert outro_time.total_count == 0


@pytest.mark.asyncio
async def test_ordem_do_fluxo_e_filtro_por_status(cenario):
    # RN-13: In Fixes primeiro, depois In Progress, In Review e In Validation.
    validacao = await _em_correcao(cenario, "Clock_000001", status="InValidation")
    fixes = await _em_correcao(cenario, "Clock_000002", status="InFixes")
    revisao = await _em_correcao(cenario, "Clock_000003", status="InReview")

    todos = await _my_fixes(cenario, cenario.ana)
    so_revisao = await _my_fixes(cenario, cenario.ana, status=("InReview",))

    assert [linha.caso_teste_id for linha in todos.items] == [fixes, revisao, validacao]
    assert [linha.caso_teste_id for linha in so_revisao.items] == [revisao]


@pytest.mark.asyncio
async def test_reincidentes_mostra_so_a_partir_da_segunda_tentativa(cenario):
    # CA-11, na SDF Failures (sem corretor).
    await _em_correcao(cenario, "Clock_000001", tentativa=1)
    segunda = await _em_correcao(cenario, "Clock_000002", tentativa=2)

    resultado = await BugReportRepositoryImpl(cenario.session).listar_casos_com_falhas(
        cenario.unidade_id,
        EscopoOverview(),
        FiltrosBugReport(projeto_id=cenario.projeto_id, reincidentes=True),
        1,
        20,
    )

    assert [linha.caso_teste_id for linha in resultado.items] == [segunda]
    assert resultado.items[0].tentativa_correcao == 2
