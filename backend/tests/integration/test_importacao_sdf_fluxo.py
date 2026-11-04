import os
from datetime import date, datetime
from pathlib import Path
from uuid import uuid4

import pytest
import pytest_asyncio
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from src.application.services.form_factor_service import FormFactorServiceImpl
from src.application.services.importacao_sdf_service import ImportacaoSdfServiceImpl
from src.application.validators.relatorio_sdf import RelatorioSdfInvalido
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.infrastructure.data.models.execucao_sdf_model import ExecucaoSdfModel
from src.infrastructure.data.models.modelo_dispositivo_model import ModeloDispositivoModel
from src.infrastructure.data.unit_of_work import UnitOfWorkImpl
from src.infrastructure.repositories.caso_teste_repository import CasoTesteRepositoryImpl
from src.infrastructure.repositories.execucao_sdf_repository import ExecucaoSdfRepositoryImpl
from src.infrastructure.repositories.historico_form_factor_repository import (
    HistoricoFormFactorRepositoryImpl,
)
from src.infrastructure.repositories.importacao_sdf_repository import ImportacaoSdfRepositoryImpl
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
