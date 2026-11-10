import os
from datetime import UTC, date, datetime
from pathlib import Path
from uuid import uuid4

import pytest
import pytest_asyncio
from sqlalchemy import func, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from src.application.services.form_factor_service import FormFactorServiceImpl
from src.application.services.importacao_sdf_service import ImportacaoSdfServiceImpl
from src.application.validators.relatorio_sdf import RelatorioSdfInvalido
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.infrastructure.data.auditoria import ContextoAuditoriaImpl
from src.infrastructure.data.models.caso_teste_model import CasoTesteModel
from src.infrastructure.data.models.execucao_sdf_model import ExecucaoSdfModel
from src.infrastructure.data.models.importacao_sdf_model import ImportacaoSdfModel
from src.infrastructure.data.models.importacao_sdf_status_model import ImportacaoSdfStatusModel
from src.infrastructure.data.models.modelo_dispositivo_model import ModeloDispositivoModel
from src.infrastructure.data.unit_of_work import UnitOfWorkImpl
from src.infrastructure.repositories.caso_teste_repository import CasoTesteRepositoryImpl
from src.infrastructure.repositories.execucao_sdf_repository import ExecucaoSdfRepositoryImpl
from src.infrastructure.repositories.historico_form_factor_repository import (
    HistoricoFormFactorRepositoryImpl,
)
from src.infrastructure.repositories.importacao_sdf_repository import ImportacaoSdfRepositoryImpl
from src.infrastructure.repositories.importacao_sdf_status_repository import (
    ImportacaoSdfStatusRepositoryImpl,
)
from src.infrastructure.repositories.modelo_dispositivo_repository import (
    ModeloDispositivoRepositoryImpl,
)
from src.infrastructure.repositories.projeto_modelo_repository import ProjetoModeloRepositoryImpl
from src.infrastructure.repositories.projeto_repository import ProjetoRepositoryImpl
from src.infrastructure.repositories.resultado_form_factor_repository import (
    ResultadoFormFactorRepositoryImpl,
)
from src.infrastructure.repositories.rodada_form_factor_repository import (
    RodadaFormFactorRepositoryImpl,
)
from src.infrastructure.repositories.time_repository import TimeRepositoryImpl
from tests.integration.test_resultado_form_factor_repository import _Cenario
from tests.unit.application.validators.test_relatorio_sdf import relatorio

pytestmark = pytest.mark.skipif(
    not os.environ.get("SDF_TEST_DATABASE_URL"),
    reason="Defina SDF_TEST_DATABASE_URL para executar a integração com Postgres.",
)

EXEMPLO = Path(__file__).parents[1] / "fixtures" / "sdf" / "123456-789012_0_Test_1_Detail.xlsx"
DIA = date(2026, 10, 21)


@pytest_asyncio.fixture
async def cenario():
    """Os services dão commit; a sessão usa savepoints e tudo é desfeito no fim do teste."""
    engine = create_async_engine(os.environ["SDF_TEST_DATABASE_URL"])
    try:
        async with engine.connect() as conexao:
            transacao = await conexao.begin()
            session = AsyncSession(
                bind=conexao, join_transaction_mode="create_savepoint", expire_on_commit=False
            )
            cenario = await _Cenario(session, uuid4()).montar()
            # O device do relatório (C4) é o nome do modelo no cadastro.
            await session.execute(
                update(ModeloDispositivoModel)
                .where(ModeloDispositivoModel.id == cenario.s26)
                .values(nome="SM-S948B")
            )
            cenario.casos = [await cenario.caso(f"Keyboard_{n:06d}") for n in range(1, 10)]
            yield cenario
            await session.close()
            await transacao.rollback()
    finally:
        await engine.dispose()


def _servicos(session):
    importacao = ImportacaoSdfServiceImpl(
        ProjetoRepositoryImpl(session),
        TimeRepositoryImpl(session),
        CasoTesteRepositoryImpl(session),
        ModeloDispositivoRepositoryImpl(session),
        ProjetoModeloRepositoryImpl(session),
        ImportacaoSdfRepositoryImpl(session),
        ExecucaoSdfRepositoryImpl(session),
        ResultadoFormFactorRepositoryImpl(session),
        UnitOfWorkImpl(session),
        RodadaFormFactorRepositoryImpl(session),
        ImportacaoSdfStatusRepositoryImpl(session),
        ContextoAuditoriaImpl(session),
    )
    form_factor = FormFactorServiceImpl(
        ProjetoRepositoryImpl(session),
        TimeRepositoryImpl(session),
        ResultadoFormFactorRepositoryImpl(session),
        ProjetoModeloRepositoryImpl(session),
        CasoTesteRepositoryImpl(session),
        ExecucaoSdfRepositoryImpl(session),
        UnitOfWorkImpl(session),
        RodadaFormFactorRepositoryImpl(session),
        historico_repo=HistoricoFormFactorRepositoryImpl(session),
    )
    return importacao, form_factor


def _gerente(cenario):
    return UsuarioAutenticado(
        cenario.ana,
        cenario.unidade_id,
        "GERENTE",
        permissoes=frozenset({"form_factor.importar", "form_factor.consultar"}),
        time_ids=(cenario.time_id,),
    )


async def _importar(cenario, importacao):
    return await importacao.importar(
        _gerente(cenario), cenario.projeto_id, EXEMPLO.name, EXEMPLO.read_bytes()
    )


@pytest.mark.asyncio
async def test_importar_o_exemplo_aparece_na_general_results(cenario):
    importacao, form_factor = _servicos(cenario.session)

    resposta = await _importar(cenario, importacao)
    historico = await form_factor.historico_projeto(_gerente(cenario), cenario.projeto_id)

    assert (resposta.quantidade_execucoes, resposta.quantidade_resultados) == (9, 9)
    assert historico.datas == [DIA]
    caso = next(item for item in historico.items if item.tc_id == "Keyboard_000001")
    assert caso.ultimo_sdf_por_modelo == {cenario.s26: "123456-789012"}
    celula = caso.resultados[DIA][cenario.s26]
    assert (celula.resultado, celula.sdf_id, celula.origem) == ("PASS", "123456-789012", "SDF")
    assert celula.descricao == "# PASS: Test case was executed successfully"
    resumo = await form_factor.resumo_execucoes(_gerente(cenario), caso.caso_teste_id)
    assert resumo.resultados[DIA][cenario.s26][0].descricao == celula.descricao


@pytest.mark.asyncio
async def test_relatorio_mais_antigo_entra_no_historico_sem_mudar_o_ultimo_sdf(cenario):
    importacao, form_factor = _servicos(cenario.session)
    await cenario.importar(
        cenario.casos[0], "SDF-2510", datetime(2026, 10, 25, 12), {cenario.s26: "FAIL"}
    )

    await _importar(cenario, importacao)
    historico = await form_factor.historico_projeto(_gerente(cenario), cenario.projeto_id)

    caso = next(item for item in historico.items if item.tc_id == "Keyboard_000001")
    assert caso.ultimo_sdf_por_modelo == {cenario.s26: "SDF-2510"}
    assert set(caso.resultados) == {date(2026, 10, 25), DIA}


@pytest.mark.asyncio
async def test_importacao_que_completa_os_devices_grava_a_finalizacao_de_tudo(cenario):
    # Spec 065, CA-04: o S25 já tinha PASS; o relatório do S26 (SM-S948B) fecha o caso na F4.
    importacao, _ = _servicos(cenario.session)
    fechado, aberto = cenario.casos[0], cenario.casos[1]
    await cenario.importar(fechado, "SDF-2010", datetime(2026, 10, 20, 9), {cenario.s25: "PASS"})

    await _importar(cenario, importacao)

    datas = dict(
        (
            await cenario.session.execute(
                select(CasoTesteModel.id, CasoTesteModel.all_passed_em).where(
                    CasoTesteModel.id.in_((fechado, aberto))
                )
            )
        ).all()
    )
    assert datas == {fechado: datetime(2026, 10, 21, 18, 43, 35), aberto: None}


@pytest.mark.asyncio
async def test_importacao_muda_o_status_e_registra_a_origem_form_factor(cenario):
    # Spec 066: CA-01 (tudo PASS → Done), CA-02 (FAIL em In Validation → In Fixes) e CA-08.
    importacao, _ = _servicos(cenario.session)
    fechado, falhou, parcial = cenario.casos[0], cenario.casos[1], cenario.casos[2]
    await cenario.importar(fechado, "SDF-2010", datetime(2026, 10, 20, 9), {cenario.s25: "PASS"})
    conteudo = relatorio(
        [
            ("Keyboard_000001.py", "PASS", "", "Keyboard_A_OneUI95.ts"),
            ("Keyboard_000002.py", "FAIL", "", "Keyboard_A_OneUI95.ts"),
            ("Keyboard_000003.py", "PASS", "", "Keyboard_A_OneUI95.ts"),
        ]
    )

    await importacao.importar(
        _gerente(cenario), cenario.projeto_id, "777777-000001_0_Test_1_Detail.xlsx", conteudo
    )

    status = dict(
        (
            await cenario.session.execute(
                select(CasoTesteModel.id, CasoTesteModel.status).where(
                    CasoTesteModel.id.in_((fechado, falhou, parcial))
                )
            )
        ).all()
    )
    assert status == {fechado: "Done", falhou: "InFixes", parcial: "InValidation"}
    origens = (
        await cenario.session.execute(
            text(
                "SELECT row_id, origem FROM auditoria_alteracoes "
                "WHERE row_id IN (:fechado, :falhou, :parcial) AND 'status' = ANY(changed_fields)"
            ),
            {"fechado": fechado, "falhou": falhou, "parcial": parcial},
        )
    ).all()
    assert sorted(origens) == sorted([(fechado, "form_factor"), (falhou, "form_factor")])


@pytest.mark.asyncio
async def test_falha_importar_o_mesmo_arquivo_de_novo_nao_grava_nada(cenario):
    importacao, _ = _servicos(cenario.session)
    await _importar(cenario, importacao)
    contar = (
        select(func.count())
        .select_from(ExecucaoSdfModel)
        .where(ExecucaoSdfModel.unidade_id == cenario.unidade_id)
    )
    antes = (await cenario.session.execute(contar)).scalar_one()

    with pytest.raises(RelatorioSdfInvalido) as erro:
        await _importar(cenario, importacao)

    assert [item.codigo for item in erro.value.erros] == ["sdf_id_repetido"]
    assert (await cenario.session.execute(contar)).scalar_one() == antes


async def _status(cenario, *caso_ids):
    return dict(
        (
            await cenario.session.execute(
                select(CasoTesteModel.id, CasoTesteModel.status).where(
                    CasoTesteModel.id.in_(caso_ids)
                )
            )
        ).all()
    )


async def _importar_tres(cenario, importacao, sdf_id="777777-000001"):
    """Keyboard_000001 fecha (o S25 já tinha PASS), o 000002 falha e o 000003 fica parcial."""
    conteudo = relatorio(
        [
            ("Keyboard_000001.py", "PASS", "", "Keyboard_A_OneUI95.ts"),
            ("Keyboard_000002.py", "FAIL", "", "Keyboard_A_OneUI95.ts"),
            ("Keyboard_000003.py", "PASS", "", "Keyboard_A_OneUI95.ts"),
        ]
    )
    return await importacao.importar(
        _gerente(cenario), cenario.projeto_id, f"{sdf_id}_0_Test_1_Detail.xlsx", conteudo
    )


@pytest.mark.asyncio
async def test_desfazer_tira_os_resultados_volta_o_status_e_a_end_date(cenario):
    # Spec 067: CA-01, CA-02, CA-04 e a origem nova no histórico (RN-06).
    importacao, form_factor = _servicos(cenario.session)
    fechado, falhou, parcial = cenario.casos[0], cenario.casos[1], cenario.casos[2]
    await cenario.importar(
        fechado,
        "SDF-2010",
        datetime(2026, 10, 20, 9),
        {cenario.s25: "PASS"},
        importado_em=datetime(2026, 10, 20, 10),
    )
    feita = await _importar_tres(cenario, importacao)

    resposta = await importacao.desfazer(_gerente(cenario), cenario.projeto_id, feita.importacao_id)

    assert resposta.casos_revertidos == 2
    assert await _status(cenario, fechado, falhou, parcial) == {
        fechado: "InValidation",
        falhou: "InValidation",
        parcial: "InValidation",
    }
    historico = await form_factor.historico_projeto(_gerente(cenario), cenario.projeto_id)
    caso = next(item for item in historico.items if item.tc_id == "Keyboard_000001")
    assert set(caso.resultados) == {date(2026, 10, 20)}
    end_date = (
        await cenario.session.execute(
            select(CasoTesteModel.all_passed_em).where(CasoTesteModel.id == fechado)
        )
    ).scalar_one()
    assert end_date is None
    origens = (
        await cenario.session.execute(
            text(
                "SELECT origem FROM auditoria_alteracoes WHERE row_id = :id "
                "AND 'status' = ANY(changed_fields) ORDER BY id"
            ),
            {"id": falhou},
        )
    ).scalars()
    assert list(origens) == ["form_factor", "importacao_sdf_desfeita"]


@pytest.mark.asyncio
async def test_falha_caso_movido_depois_da_importacao_nao_volta(cenario):
    # CA-03.
    importacao, _ = _servicos(cenario.session)
    falhou = cenario.casos[1]
    feita = await _importar_tres(cenario, importacao)
    await cenario.session.execute(
        update(CasoTesteModel).where(CasoTesteModel.id == falhou).values(status="InProgress")
    )

    await importacao.desfazer(_gerente(cenario), cenario.projeto_id, feita.importacao_id)

    assert await _status(cenario, falhou) == {falhou: "InProgress"}


@pytest.mark.asyncio
async def test_desfazer_libera_o_sdf_id_e_a_anterior_vira_a_ultima(cenario):
    # CA-05 e CA-06.
    importacao, _ = _servicos(cenario.session)
    primeira = await _importar_tres(cenario, importacao, "777777-000001")
    # Na mesma transação do teste as duas teriam o mesmo created_at.
    await cenario.session.execute(
        update(ImportacaoSdfModel)
        .where(ImportacaoSdfModel.id == primeira.importacao_id)
        .values(created_at=datetime(2026, 10, 20, 10))
    )
    segunda = await _importar_tres(cenario, importacao, "777777-000002")

    await importacao.desfazer(_gerente(cenario), cenario.projeto_id, segunda.importacao_id)
    ultima = await importacao.obter_ultima(_gerente(cenario), cenario.projeto_id)
    de_novo = await _importar_tres(cenario, importacao, "777777-000002")

    assert ultima.id == primeira.importacao_id
    assert de_novo.importacao_id != segunda.importacao_id


async def _mudar(cenario, caso_id, **valores):
    # Pelo UPDATE, para a auditoria por trigger (ADR 0044) registrar a mudança de Status.
    await cenario.session.execute(
        update(CasoTesteModel).where(CasoTesteModel.id == caso_id).values(**valores)
    )
    await cenario.session.flush()


async def _escolher_dev_fix(cenario, caso_id):
    agora = datetime.now(UTC).replace(tzinfo=None)
    await _mudar(cenario, caso_id, dev_fix_id=cenario.bia, dev_fix_em=agora)


async def _importar_pass(cenario, caso_id, sdf_id):
    """O S25 já passou; o relatório traz PASS no S26 e fecha Keyboard_000001 em Done."""
    await cenario.importar(
        caso_id, f"{sdf_id}-S25", datetime(2026, 10, 20, 9), {cenario.s25: "PASS"}
    )
    importacao, _ = _servicos(cenario.session)
    conteudo = relatorio([("Keyboard_000001.py", "PASS", "", "Keyboard_A_OneUI95.ts")])
    await importacao.importar(
        _gerente(cenario), cenario.projeto_id, f"{sdf_id}_0_Test_1_Detail.xlsx", conteudo
    )
    status = ImportacaoSdfStatusModel
    return (
        await cenario.session.execute(
            select(status.status_aplicado, status.concluiu_correcao).where(
                status.caso_teste_id == caso_id
            )
        )
    ).one()


@pytest.mark.asyncio
async def test_dev_fix_e_volta_a_validacao_concluem_a_correcao(cenario):
    # Spec 072, CA-15.
    caso = cenario.casos[0]
    await _mudar(cenario, caso, status="InFixes")
    await _escolher_dev_fix(cenario, caso)
    await _mudar(cenario, caso, status="InValidation")

    assert await _importar_pass(cenario, caso, "888888-000001") == ("Done", True)


@pytest.mark.asyncio
async def test_sem_dev_fix_o_done_nao_conclui(cenario):
    # Spec 072, CA-16 (falha).
    caso = cenario.casos[0]
    await _mudar(cenario, caso, status="InFixes")
    await _mudar(cenario, caso, status="InValidation")

    assert await _importar_pass(cenario, caso, "888888-000002") == ("Done", False)


@pytest.mark.asyncio
async def test_dev_fix_escolhido_com_o_caso_ja_em_validacao_nao_conclui(cenario):
    # Spec 072, CA-17 (falha): o caso não passou por uma correção depois do Dev Fix.
    caso = cenario.casos[0]
    await _mudar(cenario, caso, status="InFixes")
    await _mudar(cenario, caso, status="InValidation")
    await _escolher_dev_fix(cenario, caso)

    assert await _importar_pass(cenario, caso, "888888-000003") == ("Done", False)
