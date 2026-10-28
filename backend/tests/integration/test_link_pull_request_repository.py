import os
from datetime import datetime, timedelta
from uuid import uuid4

import pytest
import pytest_asyncio
from sqlalchemy import update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from src.application.schemas.importacao_projeto import ImportarProjetoPlanilhaRequest
from src.application.services.importacao_projeto_service import ImportacaoProjetoServiceImpl
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.link_pull_request import LinkPullRequest
from src.infrastructure.data.models.link_pull_request_model import LinkPullRequestModel
from src.infrastructure.data.models.time_membro_model import TimeMembroModel
from src.infrastructure.data.unit_of_work import UnitOfWorkImpl
from src.infrastructure.repositories.caso_teste_repository import CasoTesteRepositoryImpl
from src.infrastructure.repositories.link_pull_request_repository import (
    LinkPullRequestRepositoryImpl,
)
from src.infrastructure.repositories.modelo_dispositivo_repository import (
    ModeloDispositivoRepositoryImpl,
)
from src.infrastructure.repositories.projeto_modelo_repository import ProjetoModeloRepositoryImpl
from src.infrastructure.repositories.projeto_repository import ProjetoRepositoryImpl
from src.infrastructure.repositories.time_membro_repository import TimeMembroRepositoryImpl
from src.infrastructure.repositories.time_repository import TimeRepositoryImpl
from src.infrastructure.repositories.usuario_repository import UsuarioRepositoryImpl
from tests.integration.test_resultado_form_factor_repository import _Cenario
from tests.unit.application.services.test_importacao_projeto_service import criar_arquivo

pytestmark = pytest.mark.skipif(
    not os.environ.get("SDF_TEST_DATABASE_URL"),
    reason="Defina SDF_TEST_DATABASE_URL para executar a integração com Postgres.",
)

URL = "https://github.sec.samsung.net/org/repo/pull/{}"


@pytest_asyncio.fixture
async def cenario():
    """A importação dá commit; a sessão usa savepoints e tudo é desfeito no fim do teste."""
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


async def _adicionar(cenario, caso_id, url, autor_id, criado_em=None):
    link = LinkPullRequest(cenario.unidade_id, caso_id, url, autor_id)
    await LinkPullRequestRepositoryImpl(cenario.session).adicionar(link)
    await cenario.session.flush()
    if criado_em is not None:
        await cenario.session.execute(
            update(LinkPullRequestModel)
            .where(LinkPullRequestModel.id == link.id)
            .values(created_at=criado_em)
        )
    return link


async def _remover(cenario, link):
    # Como no service: inativa o link lido do banco, que já tem created_at.
    repo = LinkPullRequestRepositoryImpl(cenario.session)
    persistido = await repo.obter_por_id(cenario.unidade_id, link.id)
    persistido.inativar()
    await repo.atualizar(persistido)
    await cenario.session.flush()


@pytest.mark.asyncio
async def test_lista_ativos_do_caso_do_mais_recente_ao_mais_antigo_com_o_autor(cenario):
    repo = LinkPullRequestRepositoryImpl(cenario.session)
    caso, outro_caso = await cenario.caso("clock_000001"), await cenario.caso("clock_000002")
    agora = datetime(2026, 10, 28, 12, 0)
    mais_antigo = await _adicionar(cenario, caso, URL.format(1), cenario.ana, agora)
    mais_novo = await _adicionar(
        cenario, caso, URL.format(3), cenario.bia, agora + timedelta(hours=2)
    )
    meio = await _adicionar(cenario, caso, URL.format(2), cenario.ana, agora + timedelta(hours=1))
    await _adicionar(cenario, outro_caso, URL.format(9), cenario.ana)
    await _remover(cenario, await _adicionar(cenario, caso, URL.format(4), cenario.ana))

    links = await repo.listar_ativos_por_caso(cenario.unidade_id, caso)

    assert [item.link.id for item in links] == [mais_novo.id, meio.id, mais_antigo.id]
    assert [item.autor_nome for item in links] == ["Bia", "Ana", "Ana"]
    assert links[0].link.url == URL.format(3)
    assert links[0].link.created_by == cenario.bia
    assert await repo.listar_ativos_por_caso(uuid4(), caso) == ()
    assert await repo.existe_ativo(cenario.unidade_id, caso, URL.format(1))
    assert not await repo.existe_ativo(cenario.unidade_id, caso, URL.format(4))
    assert not await repo.existe_ativo(cenario.unidade_id, caso, URL.format(9))
    assert not await repo.existe_ativo(uuid4(), caso, URL.format(1))


@pytest.mark.asyncio
async def test_indice_recusa_dois_ativos_iguais_no_mesmo_caso(cenario):
    caso, outro_caso = await cenario.caso("clock_000001"), await cenario.caso("clock_000002")
    primeiro = await _adicionar(cenario, caso, URL.format(1), cenario.ana)
    # A mesma URL em outro caso é aceita e, depois de removida, volta ao mesmo caso.
    await _adicionar(cenario, outro_caso, URL.format(1), cenario.ana)
    await _remover(cenario, primeiro)
    await _adicionar(cenario, caso, URL.format(1), cenario.bia)

    with pytest.raises(IntegrityError):
        await _adicionar(cenario, caso, URL.format(1), cenario.ana)


@pytest.mark.asyncio
async def test_importacao_nao_altera_links_de_casos_existentes(cenario):
    session = cenario.session
    caso = await cenario.caso("clock_000001")
    ativo = await _adicionar(cenario, caso, URL.format(1), cenario.ana)
    removido = await _adicionar(cenario, caso, URL.format(2), cenario.bia)
    await _remover(cenario, removido)
    for usuario_id in (cenario.ana, cenario.bia):
        session.add(
            TimeMembroModel(
                id=uuid4(),
                unidade_id=cenario.unidade_id,
                time_id=cenario.time_id,
                usuario_id=usuario_id,
            )
        )
    await session.flush()
    repo = LinkPullRequestRepositoryImpl(session)
    importacao = ImportacaoProjetoServiceImpl(
        ProjetoRepositoryImpl(session),
        CasoTesteRepositoryImpl(session),
        TimeRepositoryImpl(session),
        TimeMembroRepositoryImpl(session),
        UsuarioRepositoryImpl(session),
        ModeloDispositivoRepositoryImpl(session),
        ProjetoModeloRepositoryImpl(session),
        UnitOfWorkImpl(session),
    )
    admin = UsuarioAutenticado(cenario.ana, cenario.unidade_id, "ADMIN_UNIDADE")

    resposta = await importacao.importar(
        admin,
        ImportarProjetoPlanilhaRequest(time_id=cenario.time_id),
        criar_arquivo(("clock_000001", "Ana", "Bia"), ("clock_000002", "Bia", "Ana")),
    )

    assert resposta.quantidade_casos == 2
    depois = await repo.listar_ativos_por_caso(cenario.unidade_id, caso)
    assert [(i.link.id, i.link.url) for i in depois] == [(ativo.id, URL.format(1))]
    assert (await repo.obter_por_id(cenario.unidade_id, removido.id)).ativo is False
