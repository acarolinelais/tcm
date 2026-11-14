import os
from datetime import datetime
from uuid import uuid4

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from src.application.services.registro_de_correcoes import RegistroDeCorrecoes
from src.domain.entities.correcao import Correcao, OrigemCorrecao, ResultadoCorrecao
from src.domain.queries.correcao_concluida import FiltrosCorrecoesConcluidas
from src.domain.queries.resumo_overview import EscopoOverview
from src.infrastructure.repositories.correcao_repository import CorrecaoRepositoryImpl
from tests.integration.test_resultado_form_factor_repository import _Cenario

pytestmark = pytest.mark.skipif(
    not os.environ.get("SDF_TEST_DATABASE_URL"),
    reason="Defina SDF_TEST_DATABASE_URL para executar a integração com Postgres.",
)


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


@pytest.mark.asyncio
async def test_abrir_e_fechar_na_mesma_sessao_mantem_o_created_at(cenario):
    caso = await cenario.caso("Clock_000001")
    importacao = await cenario.importar(
        caso, "SDF-1", datetime(2026, 11, 10), {cenario.s26: "FAIL"}
    )
    repo = CorrecaoRepositoryImpl(cenario.session)
    correcao = Correcao(
        cenario.unidade_id, caso, 1, OrigemCorrecao.VALIDACAO, datetime(2026, 11, 10), importacao.id
    )
    await repo.adicionar(correcao)

    aberta = await repo.obter_aberta(cenario.unidade_id, caso)
    aberta.fechar(ResultadoCorrecao.CORRIGIDA, datetime(2026, 11, 14), cenario.ana, None)
    await repo.atualizar(aberta)
    await cenario.session.flush()

    assert await repo.obter_aberta(cenario.unidade_id, caso) is None
    fechada = await repo.obter_por_tentativa(cenario.unidade_id, caso, 1)
    assert fechada.resultado is ResultadoCorrecao.CORRIGIDA
    assert fechada.created_at is not None
    assert [c.id for c in await repo.listar_por_importacao(cenario.unidade_id, importacao.id)] == [
        correcao.id
    ]


@pytest.mark.asyncio
async def test_falha_tentativa_inativa_e_de_outra_unidade_nao_aparecem(cenario):
    caso = await cenario.caso("Clock_000002")
    repo = CorrecaoRepositoryImpl(cenario.session)
    desfeita = Correcao(
        cenario.unidade_id, caso, 1, OrigemCorrecao.REGRESSAO, datetime(2026, 11, 10)
    )
    desfeita.inativar()
    await repo.adicionar(desfeita)
    await cenario.session.flush()

    assert await repo.obter_aberta(cenario.unidade_id, caso) is None
    assert await repo.obter_por_tentativa(cenario.unidade_id, caso, 1) is None
    assert await repo.obter_aberta(uuid4(), caso) is None


async def _fechada(cenario, repo, caso, corretor, falha_em, fechada_em, resultado="corrigida"):
    correcao = Correcao(cenario.unidade_id, caso, 1, OrigemCorrecao.VALIDACAO, falha_em)
    correcao.fechar(ResultadoCorrecao(resultado), fechada_em, corretor, None)
    await repo.adicionar(correcao)
    await cenario.session.flush()
    return correcao


@pytest.mark.asyncio
async def test_concluidas_do_dev_so_as_dele_com_os_dias_no_fuso(cenario):
    # CA-10 e CA-11: Ana vê a dela; a da Bia fica de fora. 11/11 02h UTC ainda é 10/11 em Manaus,
    # então são 4 dias lá e 3 em UTC.
    repo = CorrecaoRepositoryImpl(cenario.session)
    da_ana = await _fechada(
        cenario, repo, await cenario.caso("Clock_000010"), cenario.ana,
        datetime(2026, 11, 11, 2), datetime(2026, 11, 14, 15),
    )  # fmt: skip
    await _fechada(
        cenario, repo, await cenario.caso("Clock_000011"), cenario.bia,
        datetime(2026, 11, 10, 9), datetime(2026, 11, 11, 9),
    )  # fmt: skip
    escopo = EscopoOverview(time_ids=(cenario.time_id,), pessoa_id=cenario.ana)

    pagina = await repo.listar_concluidas(
        cenario.unidade_id,
        escopo,
        FiltrosCorrecoesConcluidas(projeto_id=cenario.projeto_id),
        1,
        20,
        "America/Manaus",
    )

    assert pagina.total_count == 1
    [linha] = pagina.items
    assert (linha.id, linha.tc_id, linha.dias_ate_corrigir) == (da_ana.id, "Clock_000010", 4)
    em_utc = await repo.listar_concluidas(
        cenario.unidade_id,
        escopo,
        FiltrosCorrecoesConcluidas(projeto_id=cenario.projeto_id),
        1,
        20,
        "UTC",
    )
    assert em_utc.items[0].dias_ate_corrigir == 3


@pytest.mark.asyncio
async def test_concluidas_da_gestao_filtra_por_corretor_resultado_e_periodo(cenario):
    # CA-12.
    repo = CorrecaoRepositoryImpl(cenario.session)
    caso = await cenario.caso("Clock_000012")
    await _fechada(cenario, repo, caso, cenario.ana, datetime(2026, 11, 2), datetime(2026, 11, 4))
    outra = await cenario.caso("Clock_000013")
    na_semana = await _fechada(
        cenario, repo, outra, cenario.ana, datetime(2026, 11, 9), datetime(2026, 11, 12)
    )
    terceira = await cenario.caso("Clock_000014")
    await _fechada(
        cenario, repo, terceira, cenario.ana, datetime(2026, 11, 9), datetime(2026, 11, 12),
        "falhou_de_novo",
    )  # fmt: skip
    escopo = EscopoOverview(time_ids=(cenario.time_id,))
    filtros = FiltrosCorrecoesConcluidas(
        projeto_id=cenario.projeto_id,
        corretor_id=cenario.ana,
        resultado="corrigida",
        inicio=datetime(2026, 11, 9),
        fim=datetime(2026, 11, 16),
    )

    pagina = await repo.listar_concluidas(cenario.unidade_id, escopo, filtros, 1, 20, "UTC")

    assert [linha.id for linha in pagina.items] == [na_semana.id]


@pytest.mark.asyncio
async def test_desfazer_a_importacao_que_fechou_uma_e_abriu_outra_no_banco(cenario):
    # RN-06 com o índice de uma aberta por caso: a 2 some antes de a 1 reabrir.
    caso = await cenario.caso("Clock_000020")
    importacao = await cenario.importar(
        caso, "SDF-X", datetime(2026, 11, 12), {cenario.s26: "FAIL"}
    )
    repo = CorrecaoRepositoryImpl(cenario.session)
    primeira = Correcao(
        cenario.unidade_id, caso, 1, OrigemCorrecao.VALIDACAO, datetime(2026, 11, 10)
    )
    primeira.fechar(
        ResultadoCorrecao.FALHOU_DE_NOVO, datetime(2026, 11, 12), cenario.ana,
        datetime(2026, 11, 11), importacao.id,
    )  # fmt: skip
    segunda = Correcao(
        cenario.unidade_id, caso, 2, OrigemCorrecao.VALIDACAO, datetime(2026, 11, 12), importacao.id
    )
    await repo.adicionar(primeira)
    await repo.adicionar(segunda)
    await cenario.session.flush()

    await RegistroDeCorrecoes(repo).desfazer(cenario.unidade_id, importacao.id, {caso})
    await cenario.session.flush()

    aberta = await repo.obter_aberta(cenario.unidade_id, caso)
    assert aberta.id == primeira.id
    assert aberta.em_revisao_em == datetime(2026, 11, 11)
    assert await repo.obter_por_tentativa(cenario.unidade_id, caso, 2) is None
