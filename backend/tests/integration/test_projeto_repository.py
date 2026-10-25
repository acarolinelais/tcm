import os
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from src.domain.entities.projeto import Projeto, StatusProjeto
from src.domain.entities.projeto_modelo import ProjetoModelo
from src.infrastructure.data.models.modelo_dispositivo_model import ModeloDispositivoModel
from src.infrastructure.data.models.projeto_model import ProjetoModel
from src.infrastructure.data.models.setor_model import SetorModel
from src.infrastructure.data.models.time_model import TimeModel
from src.infrastructure.data.models.unidade_model import UnidadeModel
from src.infrastructure.data.models.usuario_model import UsuarioModel  # noqa: F401
from src.infrastructure.repositories.modelo_dispositivo_repository import (
    ModeloDispositivoRepositoryImpl,
)
from src.infrastructure.repositories.projeto_modelo_repository import ProjetoModeloRepositoryImpl
from src.infrastructure.repositories.projeto_repository import ProjetoRepositoryImpl

pytestmark = pytest.mark.skipif(
    not os.environ.get("SDF_TEST_DATABASE_URL"),
    reason="Defina SDF_TEST_DATABASE_URL para executar a integração com Postgres.",
)


@pytest.mark.asyncio
async def test_projeto_persiste_status_e_isola_obtencao_por_unidade():
    engine = create_async_engine(os.environ["SDF_TEST_DATABASE_URL"])
    unidade_id, outra_unidade_id, setor_id, time_id = (uuid4() for _ in range(4))
    projeto = Projeto(unidade_id, time_id, "Clock", "9.5")
    try:
        async with async_sessionmaker(engine, expire_on_commit=False)() as session:
            session.add_all(
                [
                    UnidadeModel(id=unidade_id, nome=f"Projeto {unidade_id}"),
                    UnidadeModel(id=outra_unidade_id, nome=f"Projeto {outra_unidade_id}"),
                ]
            )
            await session.flush()
            session.add(SetorModel(id=setor_id, unidade_id=unidade_id, nome="Mobile"))
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
            repository = ProjetoRepositoryImpl(session)
            await repository.adicionar(projeto)
            await session.flush()
            encontrado = await repository.obter_por_id(unidade_id, projeto.id)
            assert encontrado is not None
            criado_em = encontrado.created_at
            encontrado.atualizar_status(StatusProjeto.IN_PROGRESS)
            await repository.atualizar(encontrado)
            await session.flush()

            encontrado = await repository.obter_por_id(unidade_id, projeto.id)

            assert encontrado is not None
            assert encontrado.nome == "Clock 9.5"
            assert encontrado.status == StatusProjeto.IN_PROGRESS
            assert encontrado.created_at == criado_em
            assert await repository.obter_por_id(outra_unidade_id, projeto.id) is None
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_vinculo_modelo_do_projeto_persiste_e_lista_no_tenant():
    engine = create_async_engine(os.environ["SDF_TEST_DATABASE_URL"])
    unidade_id, setor_id, time_id = (uuid4() for _ in range(3))
    projeto_id, modelo_id = uuid4(), uuid4()
    try:
        async with async_sessionmaker(engine, expire_on_commit=False)() as session:
            session.add(UnidadeModel(id=unidade_id, nome=f"Projeto modelo {unidade_id}"))
            await session.flush()
            session.add(SetorModel(id=setor_id, unidade_id=unidade_id, nome="Mobile"))
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
                    app="Clock",
                    one_ui="9.5",
                )
            )
            session.add(
                ModeloDispositivoModel(
                    id=modelo_id,
                    unidade_id=unidade_id,
                    nome="S27 Ultra",
                )
            )
            await session.flush()

            repository = ProjetoModeloRepositoryImpl(session)
            vinculo = ProjetoModelo(unidade_id, projeto_id, modelo_id)
            await repository.adicionar(vinculo)
            await session.flush()

            encontrados = await repository.listar_por_projeto(unidade_id, projeto_id)

            assert len(encontrados) == 1
            assert encontrados[0].modelo_dispositivo_id == modelo_id
            assert await repository.listar_por_projeto(uuid4(), projeto_id) == ()

            modelos = ModeloDispositivoRepositoryImpl(session)
            modelo = await modelos.obter_por_id(unidade_id, modelo_id)
            assert modelo is not None
            modelo.inativar()
            await modelos.atualizar(modelo)
            await session.flush()

            assert len(await repository.listar_por_projeto(unidade_id, projeto_id)) == 1
            ativos = await modelos.listar_paginado(unidade_id, 1, 100, True)
            assert ativos.total_count == 0
    finally:
        await engine.dispose()
