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
from src.domain.common.exceptions import ForbiddenException
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.infrastructure.data.models.caso_teste_model import CasoTesteModel
from src.infrastructure.data.unit_of_work import UnitOfWorkImpl
from src.infrastructure.repositories.caso_teste_repository import CasoTesteRepositoryImpl
from src.infrastructure.repositories.execucao_sdf_repository import ExecucaoSdfRepositoryImpl
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
            yield await _Cenario(session, uuid4()).montar()
            await session.close()
            await transacao.rollback()
    finally:
        await engine.dispose()


def _servicos(session):
    form_factor = FormFactorServiceImpl(
        ProjetoRepositoryImpl(session),
        TimeRepositoryImpl(session),
        ResultadoFormFactorRepositoryImpl(session),
        ProjetoModeloRepositoryImpl(session),
        CasoTesteRepositoryImpl(session),
        ExecucaoSdfRepositoryImpl(session),
        UnitOfWorkImpl(session),
        RodadaFormFactorRepositoryImpl(session),
    )
    casos = CasoTesteServiceImpl(
        CasoTesteRepositoryImpl(session),
        ProjetoRepositoryImpl(session),
        TimeRepositoryImpl(session),
        TimeMembroRepositoryImpl(session),
        UsuarioRepositoryImpl(session),
        UnitOfWorkImpl(session),
    )
    return form_factor, casos


async def _status(cenario, caso_id):
    return await cenario.session.scalar(
        select(CasoTesteModel.status).where(CasoTesteModel.id == caso_id)
    )


@pytest.mark.asyncio
async def test_ciclo_de_duas_rodadas_preserva_historico_e_respeita_atribuicao(cenario):
    permissoes = frozenset(
        {"form_factor.consultar", "form_factor.registrar", "test_cases.consultar"}
    )
    gestora = UsuarioAutenticado(
        cenario.ana,
        cenario.unidade_id,
        "GERENTE",
        permissoes=permissoes,
        time_ids=(cenario.time_id,),
    )
    dev = UsuarioAutenticado(
        cenario.bia,
        cenario.unidade_id,
        "USUARIO_PADRAO",
        permissoes=permissoes,
        time_ids=(cenario.time_id,),
    )
    falha = await cenario.caso("TC-FAIL", cenario.bia)
    aprovado = await cenario.caso("TC-DONE", cenario.ana, backup_id=cenario.bia)
    parcial = await cenario.caso("TC-PARCIAL", cenario.bia)
    alheio = await cenario.caso("TC-ALHEIO", cenario.ana)
    fora = await cenario.caso("TC-TODO", cenario.bia, status="To-Do")
    form_factor, casos = _servicos(cenario.session)

    with pytest.raises(ForbiddenException):
        await form_factor.criar_rodada(dev, cenario.projeto_id, CriarRodadaFormFactorLoteRequest())
    primeira = await form_factor.criar_rodada(
        gestora, cenario.projeto_id, CriarRodadaFormFactorLoteRequest(sdf_id="SDF #1")
    )
    assert primeira.total_test_cases == 4

    async def registrar(usuario, rodada, caso_id, resultados):
        await form_factor.registrar_resultados_rodada(
            usuario,
            cenario.projeto_id,
            rodada.id,
            caso_id,
            EnviarResultadosRodadaRequest(resultados=resultados),
        )

    await registrar(dev, primeira, falha, {cenario.s26: "FAIL"})
    await registrar(dev, primeira, aprovado, {cenario.s26: "PASS", cenario.s25: "PASS"})
    await registrar(dev, primeira, parcial, {cenario.s25: "PASS"})
    with pytest.raises(ForbiddenException):
        await registrar(dev, primeira, alheio, {cenario.s26: "PASS"})
    assert [await _status(cenario, caso) for caso in (falha, aprovado, parcial, alheio)] == [
        "InFixes",
        "Done",
        "InValidation",
        "InValidation",
    ]

    with pytest.raises(ForbiddenException):
        await casos.atualizar(
            dev,
            alheio,
            AtualizarCasoTesteRequest(status="Cancelled", justificativa_exclusao="Fora do escopo"),
        )
    assert await _status(cenario, alheio) == "InValidation"
    for status in ("InReview", "InValidation"):
        await casos.atualizar(dev, falha, AtualizarCasoTesteRequest(status=status))
    await casos.atualizar(
        dev,
        parcial,
        AtualizarCasoTesteRequest(status="Cancelled", justificativa_exclusao="Fora do escopo"),
    )

    segunda = await form_factor.criar_rodada(
        gestora, cenario.projeto_id, CriarRodadaFormFactorLoteRequest()
    )
    rodada_casos = await form_factor.listar_casos_rodada(
        gestora, cenario.projeto_id, segunda.id, 1, 20
    )
    assert {item.caso_teste_id for item in rodada_casos.items} == {falha, alheio}
    await registrar(gestora, segunda, falha, {cenario.s26: "PASS", cenario.s25: "PASS"})
    assert await _status(cenario, falha) == "Done"
    assert await _status(cenario, fora) == "To-Do"

    historico = await form_factor.listar_resultados(
        gestora, cenario.projeto_id, 1, 20, tc_id="TC-FAIL"
    )
    por_rodada = {item.rodada_id: item for item in historico.items}
    assert por_rodada[primeira.id].sdf_id == "SDF #1"
    assert por_rodada[primeira.id].resultados == {cenario.s26: "FAIL"}
    assert por_rodada[segunda.id].sdf_id is None
    assert por_rodada[segunda.id].resultados == {cenario.s26: "PASS", cenario.s25: "PASS"}
    cancelado = await form_factor.listar_resultados(
        gestora, cenario.projeto_id, 1, 20, tc_id="TC-PARCIAL"
    )
    assert [item.resultados for item in cancelado.items] == [{cenario.s25: "PASS"}]
    recusado = await form_factor.listar_resultados(
        gestora, cenario.projeto_id, 1, 20, tc_id="TC-ALHEIO"
    )
    assert recusado.total_count == 2
    assert all(item.resultados == {} for item in recusado.items)
