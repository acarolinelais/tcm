import os
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from uuid import uuid4

import pytest
from sqlalchemy import update
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from src.infrastructure.data.models.caso_teste_model import CasoTesteModel
from src.infrastructure.data.models.perfil_model import PerfilModel
from src.infrastructure.data.models.projeto_model import ProjetoModel
from src.infrastructure.data.models.setor_model import SetorModel
from src.infrastructure.data.models.time_model import TimeModel
from src.infrastructure.data.models.unidade_model import UnidadeModel
from src.infrastructure.data.models.usuario_model import UsuarioModel
from src.infrastructure.repositories.caso_teste_repository import CasoTesteRepositoryImpl
from src.infrastructure.repositories.projeto_repository import ProjetoRepositoryImpl

pytestmark = pytest.mark.skipif(
    not os.environ.get("SDF_TEST_DATABASE_URL"),
    reason="Defina SDF_TEST_DATABASE_URL para executar a integração com Postgres.",
)


@pytest.fixture
async def contexto():
    engine = create_async_engine(os.environ["SDF_TEST_DATABASE_URL"])
    try:
        async with async_sessionmaker(engine, expire_on_commit=False)() as session:
            unidade_id, perfil_id, setor_id = (uuid4() for _ in range(3))
            time_id, outro_time_id, dev_id, colega_id, terceiro_id = (uuid4() for _ in range(5))
            session.add(UnidadeModel(id=unidade_id, nome=f"Consulta dev {unidade_id}"))
            await session.flush()
            session.add_all(
                [
                    PerfilModel(id=perfil_id, unidade_id=unidade_id, nome="Developer"),
                    SetorModel(id=setor_id, unidade_id=unidade_id, nome="Mobile"),
                ]
            )
            await session.flush()
            session.add_all(
                [
                    TimeModel(id=id_, unidade_id=unidade_id, setor_id=setor_id, nome=str(id_))
                    for id_ in (time_id, outro_time_id)
                ]
            )
            session.add_all(
                [
                    UsuarioModel(
                        id=id_,
                        unidade_id=unidade_id,
                        perfil_id=perfil_id,
                        nome=str(id_),
                        email=f"{id_}@example.com",
                    )
                    for id_ in (dev_id, colega_id, terceiro_id)
                ]
            )
            await session.flush()

            async def projeto(*, ativo=True, time=time_id, criado_em=None):
                model = ProjetoModel(
                    id=uuid4(),
                    unidade_id=unidade_id,
                    time_id=time,
                    nome="Clock 9.5",
                    app="Clock",
                    one_ui="9.5",
                    ativo=ativo,
                    created_at=criado_em or datetime.now(UTC),
                )
                session.add(model)
                await session.flush()
                return model

            async def caso(projeto, responsavel=dev_id, backup=colega_id, *, ativo=True):
                model = CasoTesteModel(
                    id=uuid4(),
                    unidade_id=unidade_id,
                    projeto_id=projeto.id,
                    tc_id=f"Clock_{uuid4()}",
                    category="A",
                    difficulty="Low",
                    situation="New",
                    status="To-Do",
                    responsavel_id=responsavel,
                    backup_id=backup,
                    ativo=ativo,
                )
                session.add(model)
                await session.flush()
                return model

            yield SimpleNamespace(
                session=session,
                unidade_id=unidade_id,
                time_id=time_id,
                outro_time_id=outro_time_id,
                dev_id=dev_id,
                colega_id=colega_id,
                terceiro_id=terceiro_id,
                projeto=projeto,
                caso=caso,
                projetos=ProjetoRepositoryImpl(session),
                casos=CasoTesteRepositoryImpl(session),
            )
            # Cada teste deixa sua transação sem commit, preservando o banco de testes.
    finally:
        await engine.dispose()


async def test_projetos_incluem_principal_backup_sem_duplicar(contexto):
    c = contexto
    principal, backup = await c.projeto(), await c.projeto()
    await c.caso(principal)
    await c.caso(principal)
    await c.caso(backup, c.colega_id, c.dev_id)

    pagina = await c.projetos.listar_associados_por_times(
        c.unidade_id, (c.time_id,), c.dev_id, 1, 20
    )

    assert {p.id for p in pagina.items} == {principal.id, backup.id}
    assert pagina.total_count == 2


async def test_projetos_ignoram_sem_associacao_e_inativos(contexto):
    c = contexto
    await c.projeto()
    colega, inativo, caso_inativo = (
        await c.projeto(),
        await c.projeto(ativo=False),
        await c.projeto(),
    )
    await c.caso(colega, c.colega_id, c.terceiro_id)
    await c.caso(inativo)
    await c.caso(caso_inativo, ativo=False)

    pagina = await c.projetos.listar_associados_por_times(
        c.unidade_id, (c.time_id,), c.dev_id, 1, 20
    )

    assert pagina.items == []
    assert pagina.total_count == 0


async def test_projetos_sem_times_nao_concede_acesso_por_atribuicao(contexto):
    c = contexto
    projeto = await c.projeto()
    await c.caso(projeto)

    pagina = await c.projetos.listar_associados_por_times(c.unidade_id, (), c.dev_id, 1, 20)

    assert pagina.items == []
    assert pagina.total_count == 0


async def test_casos_incluem_principal_backup_e_ignoram_colegas_inativos(contexto):
    c = contexto
    projeto = await c.projeto()
    principal = await c.caso(projeto, backup=None)
    backup = await c.caso(projeto, c.colega_id, c.dev_id)
    await c.caso(projeto, c.colega_id, c.terceiro_id)
    await c.caso(projeto, ativo=False)
    outro = await c.projeto()
    await c.caso(outro)

    pagina = await c.casos.listar_por_projeto(
        c.unidade_id, projeto.id, 1, 20, associado_usuario_id=c.dev_id
    )

    assert {caso.id for caso in pagina.items} == {principal.id, backup.id}
    assert pagina.total_count == 2


async def test_casos_combinam_associacao_e_filtro_responsavel_por_and(contexto):
    c = contexto
    projeto = await c.projeto()
    await c.caso(projeto)
    backup = await c.caso(projeto, c.colega_id, c.dev_id)
    await c.caso(projeto, c.colega_id, c.terceiro_id)

    pagina = await c.casos.listar_por_projeto(
        c.unidade_id,
        projeto.id,
        1,
        20,
        responsavel_id=c.colega_id,
        associado_usuario_id=c.dev_id,
    )
    vazia = await c.casos.listar_por_projeto(
        c.unidade_id,
        projeto.id,
        1,
        20,
        responsavel_id=c.terceiro_id,
        associado_usuario_id=c.dev_id,
    )

    assert [caso.id for caso in pagina.items] == [backup.id]
    assert pagina.total_count == 1
    assert vazia.items == []
    assert vazia.total_count == 0


async def test_casos_sem_filtro_pessoal_preservam_consulta_existente(contexto):
    c = contexto
    projeto = await c.projeto()
    principal = await c.caso(projeto)
    colega = await c.caso(projeto, c.colega_id, c.terceiro_id)
    inativo = await c.caso(projeto, ativo=False)

    pagina = await c.casos.listar_por_projeto(c.unidade_id, projeto.id, 1, 20)

    assert {caso.id for caso in pagina.items} == {principal.id, colega.id, inativo.id}
    assert pagina.total_count == 3


async def test_projetos_paginam_depois_da_associacao_com_ordem_estavel(contexto):
    c = contexto
    data = datetime(2026, 1, 1, tzinfo=UTC)
    # Um projeto mais recente sem associação não pode consumir a primeira página.
    await c.projeto(criado_em=data + timedelta(days=1))
    projetos = [await c.projeto(criado_em=data) for _ in range(3)]
    for projeto in projetos:
        await c.caso(projeto)
        await c.caso(projeto, c.colega_id, c.dev_id)
    esperados = sorted(p.id for p in projetos)

    paginas = [
        await c.projetos.listar_associados_por_times(
            c.unidade_id, (c.time_id,), c.dev_id, numero, 1
        )
        for numero in range(1, 5)
    ]

    assert [p.items[0].id for p in paginas[:3]] == esperados
    assert all(p.total_count == 3 for p in paginas)
    assert paginas[3].items == []
    repetida = await c.projetos.listar_associados_por_times(
        c.unidade_id, (c.time_id,), c.dev_id, 1, 1
    )
    assert repetida.items[0].id == esperados[0]


async def test_projetos_excluem_atribuicao_em_outro_time_e_unidade(contexto):
    c = contexto
    permitido = await c.projeto()
    fora_do_time = await c.projeto(time=c.outro_time_id)
    await c.caso(permitido)
    await c.caso(fora_do_time, c.colega_id, c.dev_id)

    pagina = await c.projetos.listar_associados_por_times(
        c.unidade_id, (c.time_id,), c.dev_id, 1, 20
    )
    outra_unidade = await c.projetos.listar_associados_por_times(
        uuid4(), (c.time_id, c.outro_time_id), c.dev_id, 1, 20
    )

    assert [p.id for p in pagina.items] == [permitido.id]
    assert pagina.total_count == 1
    assert outra_unidade.items == []
    assert outra_unidade.total_count == 0


async def test_casos_paginam_associacao_com_prioridade_e_total_corretos(contexto):
    c = contexto
    projeto = await c.projeto()
    backup = await c.caso(projeto, c.colega_id, c.dev_id)
    principal = await c.caso(projeto)
    outro_principal = await c.caso(projeto)
    await c.caso(projeto, c.colega_id, c.terceiro_id)
    await c.caso(projeto, ativo=False)
    backup.tc_id, principal.tc_id, outro_principal.tc_id = "Clock_000", "Clock_002", "Clock_001"
    await c.session.flush()

    paginas = [
        await c.casos.listar_por_projeto(
            c.unidade_id,
            projeto.id,
            numero,
            1,
            priorizar_responsavel_id=c.dev_id,
            associado_usuario_id=c.dev_id,
        )
        for numero in range(1, 5)
    ]

    assert [p.items[0].id for p in paginas[:3]] == [outro_principal.id, principal.id, backup.id]
    assert all(p.total_count == 3 for p in paginas)
    assert paginas[3].items == []


async def test_casos_de_outra_unidade_nao_sao_revelados(contexto):
    c = contexto
    projeto = await c.projeto()
    await c.caso(projeto)

    pagina = await c.casos.listar_por_projeto(
        uuid4(), projeto.id, 1, 20, associado_usuario_id=c.dev_id
    )

    assert pagina.items == []
    assert pagina.total_count == 0


async def test_casos_filtram_semana_antes_da_paginacao_e_respeitam_limites(contexto):
    c = contexto
    projeto = await c.projeto()
    inicio, fim = datetime(2026, 3, 23, 4), datetime(2026, 3, 30, 4)
    dentro = []
    for indice, (status, data) in enumerate(
        [
            ("Pass", inicio),
            ("Pass", fim - timedelta(seconds=1)),
            ("Pass", inicio - timedelta(seconds=1)),
            ("Pass", fim),
            ("To-Do", inicio),
        ]
    ):
        caso = await c.caso(projeto)
        await c.session.execute(
            update(CasoTesteModel)
            .where(CasoTesteModel.id == caso.id)
            .values(
                tc_id=f"Clock_{indice}",
                status=status,
                created_at=data,
                updated_at=None,
            )
        )
        if indice < 2:
            dentro.append(caso.id)
    # Caso de colega na mesma semana não pode ampliar a consulta pessoal.
    colega = await c.caso(projeto, c.colega_id, c.terceiro_id)
    await c.session.execute(
        update(CasoTesteModel)
        .where(CasoTesteModel.id == colega.id)
        .values(
            status="Pass",
            updated_at=inicio,
        )
    )
    paginas = [
        await c.casos.listar_por_projeto(
            c.unidade_id,
            projeto.id,
            n,
            1,
            associado_usuario_id=c.dev_id,
            data_final_inicio=inicio,
            data_final_fim=fim,
        )
        for n in (1, 2, 3)
    ]
    assert [p.items[0].id for p in paginas[:2]] == dentro
    assert all(p.total_count == 2 for p in paginas)
    assert paginas[2].items == []
