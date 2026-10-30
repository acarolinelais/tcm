import os
from uuid import uuid4

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from src.application.schemas.caso_teste import AtualizarCasoTesteRequest
from src.application.schemas.form_factor import (
    CriarRodadaFormFactorLoteRequest,
    EnviarResultadosRodadaRequest,
)
from src.application.schemas.link_pull_request import AdicionarLinkPullRequestRequest
from src.application.services.caso_teste_service import CasoTesteServiceImpl
from src.application.services.form_factor_service import FormFactorServiceImpl
from src.domain.common.exceptions import ForbiddenException, NotFoundException
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.caso_teste import CategoriaCasoTeste, StatusCasoTeste
from src.infrastructure.data.auditoria import ContextoAuditoriaImpl, usuario_auditoria
from src.infrastructure.data.unit_of_work import UnitOfWorkImpl
from src.infrastructure.repositories.caso_teste_repository import CasoTesteRepositoryImpl
from src.infrastructure.repositories.execucao_sdf_repository import ExecucaoSdfRepositoryImpl
from src.infrastructure.repositories.historico_caso_teste_repository import (
    HistoricoCasoTesteRepositoryImpl,
)
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

# Spec 038: os services de verdade mudam o caso, os triggers gravam e o histórico lê de volta.
PERMISSOES = frozenset({"test_cases.consultar", "form_factor.consultar", "form_factor.registrar"})


@pytest_asyncio.fixture
async def cenario():
    engine = create_async_engine(os.environ["SDF_TEST_DATABASE_URL"])
    token = usuario_auditoria.set(None)
    try:
        async with engine.connect() as conexao:
            transacao = await conexao.begin()
            session = AsyncSession(
                bind=conexao, join_transaction_mode="create_savepoint", expire_on_commit=False
            )
            cenario = await _Cenario(session, uuid4()).montar()
            cenario.gestora = UsuarioAutenticado(
                cenario.ana,
                cenario.unidade_id,
                "ADMIN_UNIDADE",
                permissoes=PERMISSOES,
                time_ids=(cenario.time_id,),
            )
            cenario.dev = UsuarioAutenticado(
                cenario.bia,
                cenario.unidade_id,
                "USUARIO_PADRAO",
                permissoes=PERMISSOES,
                time_ids=(cenario.time_id,),
            )
            yield cenario
            await session.close()
            await transacao.rollback()
    finally:
        usuario_auditoria.reset(token)
        await engine.dispose()


def _casos(session):
    return CasoTesteServiceImpl(
        CasoTesteRepositoryImpl(session),
        ProjetoRepositoryImpl(session),
        TimeRepositoryImpl(session),
        TimeMembroRepositoryImpl(session),
        UsuarioRepositoryImpl(session),
        LinkPullRequestRepositoryImpl(session),
        UnitOfWorkImpl(session),
        HistoricoCasoTesteRepositoryImpl(session),
    )


def _form_factor(session):
    return FormFactorServiceImpl(
        ProjetoRepositoryImpl(session),
        TimeRepositoryImpl(session),
        ResultadoFormFactorRepositoryImpl(session),
        ProjetoModeloRepositoryImpl(session),
        CasoTesteRepositoryImpl(session),
        ExecucaoSdfRepositoryImpl(session),
        UnitOfWorkImpl(session),
        RodadaFormFactorRepositoryImpl(session),
        contexto_auditoria=ContextoAuditoriaImpl(session),
    )


async def _como(cenario, usuario):
    """Como uma requisição nova: o usuário entra no contexto antes de a transação começar."""
    await cenario.session.commit()
    usuario_auditoria.set(usuario.id)
    return usuario


def _itens(historico):
    return [
        (i.campo, i.valor_anterior, i.valor_novo, i.usuario_nome, i.origem) for i in historico.itens
    ]


@pytest.mark.asyncio
async def test_dev_move_o_status_e_o_historico_mostra_quem_e_o_que(cenario):
    caso_id = await cenario.caso("TC-1", cenario.bia, status="InProgress", backup_id=cenario.ana)
    casos = _casos(cenario.session)

    await casos.atualizar(
        await _como(cenario, cenario.dev),
        caso_id,
        AtualizarCasoTesteRequest(status=StatusCasoTeste.IN_REVIEW),
    )
    historico = await casos.historico(await _como(cenario, cenario.gestora), caso_id)

    assert _itens(historico)[0] == ("status", "InProgress", "InReview", "Bia", "api")
    assert historico.itens[0].usuario_perfil.startswith("P ")


@pytest.mark.asyncio
async def test_exclusao_categoria_e_transferencia_entram_com_autor_e_valores(cenario):
    caso_id = await cenario.caso("TC-1", cenario.bia, status="InProgress", backup_id=cenario.ana)
    casos = _casos(cenario.session)

    await casos.atualizar(
        await _como(cenario, cenario.gestora),
        caso_id,
        AtualizarCasoTesteRequest(category=CategoriaCasoTeste.B),
    )
    await casos.transferir_para_backup(await _como(cenario, cenario.dev), caso_id)
    await casos.atualizar(
        await _como(cenario, cenario.gestora),
        caso_id,
        AtualizarCasoTesteRequest(
            status=StatusCasoTeste.CANCELLED, justificativa_exclusao="Sem hardware"
        ),
    )
    itens = _itens(await casos.historico(cenario.gestora, caso_id))

    assert ("justificativa_exclusao", None, "Sem hardware", "Ana", "api") in itens
    assert ("status", "InProgress", "Cancelled", "Ana", "api") in itens
    assert ("responsavel_id", "Bia", "Ana", "Bia", "api") in itens
    assert ("backup_id", "Ana", "Bia", "Bia", "api") in itens
    assert ("category", "A", "B", "Ana", "api") in itens
    assert itens[-1][0] == "criacao"


@pytest.mark.asyncio
async def test_incluir_e_remover_link_de_pr_entram_no_historico_do_caso(cenario):
    caso_id = await cenario.caso("TC-1", cenario.bia, status="InProgress", backup_id=cenario.ana)
    casos = _casos(cenario.session)
    url = "https://github.sec.samsung.net/org/repo/pull/42"

    link = await casos.adicionar_pull_request(
        await _como(cenario, cenario.dev), caso_id, AdicionarLinkPullRequestRequest(url=url)
    )
    await casos.remover_pull_request(await _como(cenario, cenario.gestora), caso_id, link.id)
    itens = _itens(await casos.historico(cenario.gestora, caso_id))

    assert itens[:2] == [
        ("pull_request", url, None, "Ana", "api"),
        ("pull_request", None, url, "Bia", "api"),
    ]


@pytest.mark.asyncio
async def test_resultado_fail_entra_com_a_origem_form_factor_e_o_autor_do_lancamento(cenario):
    caso_id = await cenario.caso("TC-1", cenario.bia, status="InValidation")
    form_factor = _form_factor(cenario.session)
    rodada = await form_factor.criar_rodada(
        await _como(cenario, cenario.gestora),
        cenario.projeto_id,
        CriarRodadaFormFactorLoteRequest(),
    )

    await form_factor.registrar_resultados_rodada(
        await _como(cenario, cenario.dev),
        cenario.projeto_id,
        rodada.id,
        caso_id,
        EnviarResultadosRodadaRequest(resultados={cenario.s26: "FAIL"}),
    )
    historico = await _casos(cenario.session).historico(cenario.gestora, caso_id)

    assert _itens(historico)[0] == ("status", "InValidation", "InFixes", "Bia", "form_factor")


@pytest.mark.asyncio
async def test_falha_mudanca_recusada_nao_acrescenta_itens(cenario):
    caso_id = await cenario.caso("TC-1", cenario.ana, status="InProgress", backup_id=cenario.bia)
    casos = _casos(cenario.session)
    antes = await casos.historico(cenario.gestora, caso_id)

    with pytest.raises(ForbiddenException):
        await casos.transferir_para_backup(await _como(cenario, cenario.dev), caso_id)

    assert await casos.historico(cenario.gestora, caso_id) == antes


@pytest.mark.asyncio
async def test_falha_outra_unidade_nao_le_o_historico(cenario):
    caso_id = await cenario.caso("TC-1")
    de_fora = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE", permissoes=PERMISSOES)

    with pytest.raises(NotFoundException):
        await _casos(cenario.session).historico(de_fora, caso_id)
