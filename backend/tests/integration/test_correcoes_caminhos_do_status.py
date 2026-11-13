import os
from uuid import uuid4

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from src.application.schemas.caso_teste import AtualizarCasoTesteRequest
from src.application.schemas.form_factor import (
    CriarRodadaFormFactorLoteRequest,
    EnviarResultadosRodadaRequest,
)
from src.application.services.caso_teste_service import CasoTesteServiceImpl
from src.application.services.form_factor_service import FormFactorServiceImpl
from src.application.services.registro_de_correcoes import RegistroDeCorrecoes
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.caso_teste import StatusCasoTeste
from src.infrastructure.data.models.correcao_model import CorrecaoModel
from src.infrastructure.data.models.time_membro_model import TimeMembroModel
from src.infrastructure.data.unit_of_work import UnitOfWorkImpl
from src.infrastructure.repositories.caso_teste_repository import CasoTesteRepositoryImpl
from src.infrastructure.repositories.correcao_repository import CorrecaoRepositoryImpl
from src.infrastructure.repositories.execucao_sdf_repository import ExecucaoSdfRepositoryImpl
from src.infrastructure.repositories.link_pull_request_repository import (
    LinkPullRequestRepositoryImpl,
)
from src.infrastructure.repositories.projeto_modelo_repository import ProjetoModeloRepositoryImpl
from src.infrastructure.repositories.projeto_repository import ProjetoRepositoryImpl
from src.infrastructure.repositories.resultado_form_factor_repository import (
    ResultadoFormFactorRepositoryImpl,
)
from src.infrastructure.repositories.rodada_form_factor_repository import (
    RodadaFormFactorRepositoryImpl,
)
from src.infrastructure.repositories.time_membro_repository import TimeMembroRepositoryImpl
from src.infrastructure.repositories.time_repository import TimeRepositoryImpl
from src.infrastructure.repositories.usuario_repository import UsuarioRepositoryImpl
from tests.integration.test_resultado_form_factor_repository import _Cenario

pytestmark = pytest.mark.skipif(
    not os.environ.get("SDF_TEST_DATABASE_URL"),
    reason="Defina SDF_TEST_DATABASE_URL para executar a integração com Postgres.",
)

PERMISSOES = frozenset(
    {
        "form_factor.consultar",
        "form_factor.registrar",
        "test_cases.consultar",
        "test_cases.gerenciar",
    }
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


def _servicos(session):
    registro = RegistroDeCorrecoes(CorrecaoRepositoryImpl(session))
    form_factor = FormFactorServiceImpl(
        ProjetoRepositoryImpl(session),
        TimeRepositoryImpl(session),
        ResultadoFormFactorRepositoryImpl(session),
        ProjetoModeloRepositoryImpl(session),
        CasoTesteRepositoryImpl(session),
        ExecucaoSdfRepositoryImpl(session),
        UnitOfWorkImpl(session),
        RodadaFormFactorRepositoryImpl(session),
        registro_correcoes=registro,
    )
    casos = CasoTesteServiceImpl(
        CasoTesteRepositoryImpl(session),
        ProjetoRepositoryImpl(session),
        TimeRepositoryImpl(session),
        TimeMembroRepositoryImpl(session),
        UsuarioRepositoryImpl(session),
        LinkPullRequestRepositoryImpl(session),
        UnitOfWorkImpl(session),
        registro_correcoes=registro,
    )
    return form_factor, casos


def _gestora(cenario):
    return UsuarioAutenticado(
        cenario.ana,
        cenario.unidade_id,
        "KP",
        permissoes=PERMISSOES,
        time_ids=(cenario.time_id,),
    )


async def _correcoes(cenario, caso_id):
    return (
        (
            await cenario.session.execute(
                select(CorrecaoModel)
                .where(CorrecaoModel.caso_teste_id == caso_id, CorrecaoModel.ativo.is_(True))
                .order_by(CorrecaoModel.tentativa)
            )
        )
        .scalars()
        .all()
    )


async def _rodada(cenario, form_factor, caso_id, resultados):
    gestora = _gestora(cenario)
    rodada = await form_factor.criar_rodada(
        gestora, cenario.projeto_id, CriarRodadaFormFactorLoteRequest(sdf_id=f"R-{uuid4().hex[:6]}")
    )
    await form_factor.registrar_resultados_rodada(
        gestora,
        cenario.projeto_id,
        rodada.id,
        caso_id,
        EnviarResultadosRodadaRequest(resultados=resultados),
    )


@pytest.mark.asyncio
async def test_rodada_my_fixes_e_rodada_de_novo_registram_as_duas_tentativas(cenario):
    # CA-08 pela rodada manual e pela My Fixes: falhou, voltou para validação e falhou de novo.
    caso = await cenario.caso("TC-CORRECAO", cenario.bia)
    form_factor, casos = _servicos(cenario.session)
    gestora = _gestora(cenario)

    await _rodada(cenario, form_factor, caso, {cenario.s26: "FAIL", cenario.s25: "PASS"})
    for status in (StatusCasoTeste.IN_PROGRESS, StatusCasoTeste.IN_REVIEW):
        await casos.mudar_status_da_correcao(gestora, caso, status)
    [aberta] = await _correcoes(cenario, caso)
    assert (aberta.tentativa, aberta.resultado) == (1, None)

    await casos.mudar_status_da_correcao(gestora, caso, StatusCasoTeste.IN_VALIDATION)
    await _rodada(cenario, form_factor, caso, {cenario.s26: "FAIL", cenario.s25: "PASS"})

    primeira, segunda = await _correcoes(cenario, caso)
    assert primeira.resultado == "falhou_de_novo"
    assert primeira.corretor_id == cenario.bia
    assert primeira.em_revisao_em is not None
    assert (segunda.tentativa, segunda.resultado) == (2, None)


@pytest.mark.asyncio
async def test_cancelar_em_correcao_fecha_como_encerrada(cenario):
    caso = await cenario.caso("TC-CANCELA", cenario.bia)
    form_factor, casos = _servicos(cenario.session)
    await _rodada(cenario, form_factor, caso, {cenario.s26: "FAIL"})

    await casos.atualizar(
        _gestora(cenario),
        caso,
        AtualizarCasoTesteRequest(status="Cancelled", justificativa_exclusao="Sem hardware"),
    )

    [correcao] = await _correcoes(cenario, caso)
    assert correcao.resultado == "encerrada"


@pytest.mark.asyncio
async def test_trocar_dev_fix_nao_muda_tentativa_fechada(cenario):
    # CA-09.
    caso = await cenario.caso("TC-DEVFIX", cenario.bia)
    form_factor, casos = _servicos(cenario.session)
    gestora = _gestora(cenario)
    await _rodada(cenario, form_factor, caso, {cenario.s26: "FAIL"})
    await casos.mudar_status_da_correcao(gestora, caso, StatusCasoTeste.IN_VALIDATION)
    await _rodada(cenario, form_factor, caso, {cenario.s26: "PASS", cenario.s25: "PASS"})

    # O Dev Fix precisa ser membro ativo do time.
    cenario.session.add(
        TimeMembroModel(
            id=uuid4(),
            unidade_id=cenario.unidade_id,
            time_id=cenario.time_id,
            usuario_id=cenario.ana,
        )
    )
    await cenario.session.flush()
    await casos.atualizar(gestora, caso, AtualizarCasoTesteRequest(dev_fix_id=cenario.ana))

    [correcao] = await _correcoes(cenario, caso)
    assert correcao.resultado == "corrigida"
    assert correcao.corretor_id == cenario.bia


@pytest.mark.asyncio
async def test_falha_mudanca_fora_da_correcao_nao_grava_tentativa(cenario):
    caso = await cenario.caso("TC-NORMAL", cenario.bia, status="To-Do")
    _, casos = _servicos(cenario.session)

    await casos.atualizar(_gestora(cenario), caso, AtualizarCasoTesteRequest(status="InProgress"))

    assert await _correcoes(cenario, caso) == []
