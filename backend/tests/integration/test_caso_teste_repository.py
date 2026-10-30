import os
from importlib import import_module
from uuid import uuid4

import pytest
from alembic.operations import Operations
from alembic.runtime.migration import MigrationContext
from sqlalchemy import insert, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from src.domain.common.cor_avatar import CorAvatar
from src.domain.entities.caso_teste import (
    CasoTeste,
    CategoriaCasoTeste,
    DificuldadeCasoTeste,
    NivelAutomacaoCasoTeste,
    SituacaoCasoTeste,
    StatusCasoTeste,
)
from src.infrastructure.data.models.perfil_model import PerfilModel
from src.infrastructure.data.models.projeto_model import ProjetoModel
from src.infrastructure.data.models.setor_model import SetorModel
from src.infrastructure.data.models.time_model import TimeModel
from src.infrastructure.data.models.unidade_model import UnidadeModel
from src.infrastructure.data.models.usuario_model import UsuarioModel  # noqa: F401
from src.infrastructure.repositories.caso_teste_repository import CasoTesteRepositoryImpl

pytestmark = pytest.mark.skipif(
    not os.environ.get("SDF_TEST_DATABASE_URL"),
    reason="Defina SDF_TEST_DATABASE_URL para executar a integração com Postgres.",
)


@pytest.mark.asyncio
async def test_caso_persiste_com_responsaveis_e_tc_id_e_unico_no_projeto():
    engine = create_async_engine(os.environ["SDF_TEST_DATABASE_URL"])
    unidade_id, setor_id, time_id, projeto_id, perfil_id = (uuid4() for _ in range(5))
    responsavel_id, backup_id = uuid4(), uuid4()
    try:
        async with async_sessionmaker(engine, expire_on_commit=False)() as session:
            session.add(UnidadeModel(id=unidade_id, nome=f"Casos {unidade_id}"))
            await session.flush()
            session.add_all(
                [
                    PerfilModel(
                        id=perfil_id,
                        unidade_id=unidade_id,
                        nome=f"Perfil {perfil_id}",
                    ),
                    SetorModel(id=setor_id, unidade_id=unidade_id, nome="Mobile"),
                ]
            )
            await session.flush()
            session.add(
                TimeModel(
                    id=time_id,
                    unidade_id=unidade_id,
                    setor_id=setor_id,
                    nome="Time Clock",
                )
            )
            await session.flush()
            session.add(
                ProjetoModel(
                    id=projeto_id,
                    unidade_id=unidade_id,
                    time_id=time_id,
                    nome="Clock 9.5",
                    app="Clock",
                    one_ui="9.5",
                )
            )
            session.add_all(
                [
                    UsuarioModel(
                        id=responsavel_id,
                        unidade_id=unidade_id,
                        nome="Principal",
                        email=f"principal-{responsavel_id}@example.com",
                        perfil_id=perfil_id,
                    ),
                    UsuarioModel(
                        id=backup_id,
                        unidade_id=unidade_id,
                        nome="Backup",
                        email=f"backup-{backup_id}@example.com",
                        perfil_id=perfil_id,
                    ),
                ]
            )
            await session.flush()

            repository = CasoTesteRepositoryImpl(session)
            caso = CasoTeste(
                unidade_id,
                projeto_id,
                "Clock_001",
                CategoriaCasoTeste.A,
                DificuldadeCasoTeste.LOW,
                responsavel_id,
                backup_id,
                SituacaoCasoTeste.NEW_STEP,
                title="Check Writing style",
                procedure="1. Messages > Compose\n2-1. Select Shorten",
                expected_result="😀" * CasoTeste.TEXTO_MAX_LENGTH,
            )
            await repository.adicionar(caso)
            await session.flush()

            pagina = await repository.listar_por_projeto(unidade_id, projeto_id, 1, 10)
            assert pagina.total_count == 1
            assert pagina.items[0].tc_id == "Clock_001"
            assert pagina.items[0].responsavel_id == responsavel_id
            assert pagina.items[0].backup_id == backup_id
            assert pagina.items[0].situation == SituacaoCasoTeste.NEW_STEP
            assert pagina.items[0].status == StatusCasoTeste.TO_DO
            assert pagina.items[0].automation_level is None
            pagina_filtrada = await repository.listar_por_projeto(
                unidade_id, projeto_id, 1, 10, [responsavel_id]
            )
            assert pagina_filtrada.total_count == 1
            assert pagina_filtrada.items[0].responsavel_id == responsavel_id
            sem_resultados = await repository.listar_por_projeto(
                unidade_id, projeto_id, 1, 10, [uuid4()]
            )
            assert sem_resultados.items == []
            assert sem_resultados.total_count == 0
            assert await repository.existe_tc_id(unidade_id, projeto_id, "Clock_001")

            # Clock_000 vem antes por TC ID, mas o usuário é só backup dele: Clock_001 sobe.
            await repository.adicionar(
                CasoTeste(
                    unidade_id,
                    projeto_id,
                    "Clock_000",
                    CategoriaCasoTeste.A,
                    DificuldadeCasoTeste.LOW,
                    backup_id,
                    responsavel_id,
                    SituacaoCasoTeste.NEW,
                )
            )
            await session.flush()
            sem_prioridade = await repository.listar_por_projeto(unidade_id, projeto_id, 1, 10)
            assert [c.tc_id for c in sem_prioridade.items] == ["Clock_000", "Clock_001"]
            priorizada = await repository.listar_por_projeto(
                unidade_id, projeto_id, 1, 10, priorizar_responsavel_id=responsavel_id
            )
            assert [c.tc_id for c in priorizada.items] == ["Clock_001", "Clock_000"]
            assert not await repository.existe_tc_id(uuid4(), projeto_id, "Clock_001")

            # Como no service: transfere o caso lido do banco, que já tem created_at.
            persistido = await repository.obter_por_id(unidade_id, caso.id)
            assert persistido is not None
            persistido.transferir_para_backup()
            await repository.atualizar(persistido)
            await session.flush()
            transferido = await repository.obter_por_id(unidade_id, caso.id)
            assert transferido is not None
            assert transferido.responsavel_id == backup_id
            assert transferido.backup_id == responsavel_id

            # "InValidation" passa do antigo VARCHAR(10) da coluna: grava e lê de volta.
            transferido.atualizar_campos_do_responsavel(
                StatusCasoTeste.IN_VALIDATION, transferido.category, transferido.difficulty
            )
            await repository.atualizar(transferido)
            await session.flush()
            validando = await repository.obter_por_id(unidade_id, caso.id)
            assert validando is not None
            assert validando.status == StatusCasoTeste.IN_VALIDATION

            # Automation Level grava só o número e uma atualização sem nível mantém o que existe.
            validando.atualizar_campos_do_responsavel(
                validando.status,
                validando.category,
                validando.difficulty,
                automation_level=NivelAutomacaoCasoTeste.PARCIALMENTE_AUTOMATIZAVEL,
            )
            await repository.atualizar(validando)
            await session.flush()
            com_nivel = await repository.obter_por_id(unidade_id, caso.id)
            assert com_nivel is not None
            assert com_nivel.automation_level is NivelAutomacaoCasoTeste.PARCIALMENTE_AUTOMATIZAVEL
            com_nivel.atualizar_campos_do_responsavel(
                StatusCasoTeste.IN_PROGRESS, com_nivel.category, com_nivel.difficulty
            )
            await repository.atualizar(com_nivel)
            await session.flush()
            mantido = await repository.obter_por_id(unidade_id, caso.id)
            assert mantido is not None
            assert mantido.automation_level is NivelAutomacaoCasoTeste.PARCIALMENTE_AUTOMATIZAVEL

            # Spec 026: a justificativa é persistida ao excluir e vira NULL ao reativar.
            validando.cancelar("Depende de hardware indisponível")
            await repository.atualizar(validando)
            await session.flush()
            excluido = await repository.obter_por_id(unidade_id, caso.id)
            assert excluido is not None
            assert excluido.justificativa_exclusao == "Depende de hardware indisponível"
            excluido.atualizar_campos_do_responsavel(
                StatusCasoTeste.TO_DO, excluido.category, excluido.difficulty
            )
            await repository.atualizar(excluido)
            await session.flush()
            reativado = await repository.obter_por_id(unidade_id, caso.id)
            assert reativado is not None
            assert reativado.justificativa_exclusao is None

            # Spec 028: os textos atravessam o banco como vieram, com as quebras de linha, e o
            # VARCHAR(n) conta caracteres (10 mil emojis cabem).
            assert reativado.title == "Check Writing style"
            assert reativado.precondition is None
            assert reativado.procedure == "1. Messages > Compose\n2-1. Select Shorten"
            assert reativado.expected_result == "😀" * CasoTeste.TEXTO_MAX_LENGTH

            duplicado = CasoTeste(
                unidade_id,
                projeto_id,
                "Clock_001",
                CategoriaCasoTeste.B,
                DificuldadeCasoTeste.MEDIUM,
                responsavel_id,
                backup_id,
                SituacaoCasoTeste.NEW,
            )
            await repository.adicionar(duplicado)
            with pytest.raises(IntegrityError):
                await session.flush()
            await session.rollback()
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_migration_preserva_progresso_em_status_e_preenche_situation_new():
    engine = create_async_engine(os.environ["SDF_TEST_DATABASE_URL"])
    migration = import_module(
        "src.infrastructure.data.migrations.versions.8293a4b5c6d7_caso_teste_situation_e_status"
    )

    def executar(sync_connection, passo):
        with Operations.context(MigrationContext.configure(sync_connection)):
            passo()

    try:
        async with engine.connect() as connection:
            transaction = await connection.begin()
            try:
                # Volta ao esquema anterior, grava um caso antigo e reaplica a migration.
                await connection.run_sync(executar, migration.downgrade)
                unidade_id, setor_id, time_id, projeto_id, perfil_id, usuario_id, caso_id = (
                    uuid4() for _ in range(7)
                )
                for model, valores in [
                    (UnidadeModel, {"id": unidade_id, "nome": f"Migration {unidade_id}"}),
                    (
                        PerfilModel,
                        {"id": perfil_id, "unidade_id": unidade_id, "nome": f"P {perfil_id}"},
                    ),
                    (SetorModel, {"id": setor_id, "unidade_id": unidade_id, "nome": "Mobile"}),
                    (
                        TimeModel,
                        {
                            "id": time_id,
                            "unidade_id": unidade_id,
                            "setor_id": setor_id,
                            "nome": "T",
                        },
                    ),
                    (
                        ProjetoModel,
                        {
                            "id": projeto_id,
                            "unidade_id": unidade_id,
                            "time_id": time_id,
                            "nome": "Clock 9.5",
                            "app": "Clock",
                            "one_ui": "9.5",
                        },
                    ),
                    (
                        UsuarioModel,
                        {
                            "id": usuario_id,
                            "unidade_id": unidade_id,
                            "nome": "Pessoa",
                            "email": f"{usuario_id}@example.com",
                            "perfil_id": perfil_id,
                        },
                    ),
                ]:
                    await connection.execute(insert(model).values(**valores))
                # O caso antigo usa SQL puro: o model atual já tem a coluna `status`.
                await connection.execute(
                    text(
                        "INSERT INTO casos_teste (id, unidade_id, projeto_id, tc_id, category, "
                        "difficulty, situation, responsavel_id) "
                        "VALUES (:id, :u, :p, 'Clock_001', 'A', 'Low', 'InProgress', :r)"
                    ),
                    {"id": caso_id, "u": unidade_id, "p": projeto_id, "r": usuario_id},
                )

                await connection.run_sync(executar, migration.upgrade)
                linha = (
                    await connection.execute(
                        text("SELECT situation, status FROM casos_teste WHERE id = :id"),
                        {"id": caso_id},
                    )
                ).one()

                assert linha.situation == "New"
                assert linha.status == "InProgress"
            finally:
                await transaction.rollback()
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_listar_cards_por_projeto_traz_ativos_com_nome_do_responsavel():
    engine = create_async_engine(os.environ["SDF_TEST_DATABASE_URL"])
    unidade_id, setor_id, time_id, perfil_id, usuario_id = (uuid4() for _ in range(5))
    projeto_id, outro_projeto_id = uuid4(), uuid4()
    try:
        async with async_sessionmaker(engine, expire_on_commit=False)() as session:
            session.add(UnidadeModel(id=unidade_id, nome=f"Kanban {unidade_id}"))
            await session.flush()
            session.add_all(
                [
                    PerfilModel(id=perfil_id, unidade_id=unidade_id, nome=f"Perfil {perfil_id}"),
                    SetorModel(id=setor_id, unidade_id=unidade_id, nome="Mobile"),
                ]
            )
            await session.flush()
            session.add(TimeModel(id=time_id, unidade_id=unidade_id, setor_id=setor_id, nome="T"))
            await session.flush()
            session.add_all(
                [
                    ProjetoModel(
                        id=id_,
                        unidade_id=unidade_id,
                        time_id=time_id,
                        nome=nome,
                        app="Clock",
                        one_ui=versao,
                    )
                    for id_, nome, versao in (
                        (projeto_id, "Clock 9.5", "9.5"),
                        (outro_projeto_id, "Clock 9.0", "9.0"),
                    )
                ]
                + [
                    UsuarioModel(
                        id=usuario_id,
                        unidade_id=unidade_id,
                        nome="Afonso Fagundes",
                        email=f"afonso-{usuario_id}@example.com",
                        perfil_id=perfil_id,
                        cor_avatar="verde",
                    )
                ]
            )
            await session.flush()

            repository = CasoTesteRepositoryImpl(session)

            def caso(projeto: object, tc_id: str) -> CasoTeste:
                return CasoTeste(
                    unidade_id,
                    projeto,
                    tc_id,
                    CategoriaCasoTeste.A,
                    DificuldadeCasoTeste.LOW,
                    usuario_id,
                    None,
                    SituacaoCasoTeste.NEW,
                    exigir_backup=False,
                )

            inativo = caso(projeto_id, "Clock_003")
            for novo in (
                caso(projeto_id, "Clock_002"),
                caso(projeto_id, "Clock_001"),
                inativo,
                caso(outro_projeto_id, "Clock_009"),
            ):
                await repository.adicionar(novo)
            await session.flush()
            await session.execute(
                text("UPDATE casos_teste SET ativo = false WHERE id = :id"), {"id": inativo.id}
            )

            cards = await repository.listar_cards_por_projeto(unidade_id, projeto_id)
            assert [card.caso.tc_id for card in cards] == ["Clock_001", "Clock_002"]
            assert {card.responsavel_nome for card in cards} == {"Afonso Fagundes"}
            assert {card.responsavel_cor_avatar for card in cards} == {CorAvatar.VERDE}

            # Outra unidade não enxerga os casos, mesmo com o id do projeto certo.
            assert await repository.listar_cards_por_projeto(uuid4(), projeto_id) == ()
            await session.rollback()
    finally:
        await engine.dispose()
