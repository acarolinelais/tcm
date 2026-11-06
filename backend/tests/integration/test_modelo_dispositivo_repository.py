import os
from datetime import datetime
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from src.domain.entities.modelo_dispositivo import ModeloDispositivo
from src.infrastructure.data.models.unidade_model import UnidadeModel
from src.infrastructure.repositories.modelo_dispositivo_repository import (
    ModeloDispositivoRepositoryImpl,
)

pytestmark = pytest.mark.skipif(
    not os.environ.get("SDF_TEST_DATABASE_URL"),
    reason="Defina SDF_TEST_DATABASE_URL para executar a integração com Postgres.",
)


@pytest.mark.asyncio
async def test_modelos_paginam_por_tenant_e_listar_por_ids_ignora_inativos():
    engine = create_async_engine(os.environ["SDF_TEST_DATABASE_URL"])
    unidade_id, outra_unidade_id = uuid4(), uuid4()
    try:
        async with async_sessionmaker(engine, expire_on_commit=False)() as session:
            session.add_all(
                [
                    UnidadeModel(id=unidade_id, nome=f"Modelos {unidade_id}"),
                    UnidadeModel(id=outra_unidade_id, nome=f"Modelos {outra_unidade_id}"),
                ]
            )
            await session.flush()
            ativo = ModeloDispositivo(unidade_id, "S27 Ultra")
            inativo = ModeloDispositivo(unidade_id, "S26 Ultra")
            inativo.inativar()
            outro_tenant = ModeloDispositivo(outra_unidade_id, "S27 Ultra")
            repository = ModeloDispositivoRepositoryImpl(session)
            for modelo in (ativo, inativo, outro_tenant):
                await repository.adicionar(modelo)
            await session.flush()

            resultado = await repository.listar_paginado(unidade_id, 1, 10)
            ativos = await repository.listar_por_ids(unidade_id, (ativo.id, inativo.id))

            assert resultado.total_count == 2
            assert {modelo.id for modelo in ativos} == {ativo.id}
            assert all(modelo.id != outro_tenant.id for modelo in resultado.items)
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_descricao_persiste_e_edicao_preserva_created_at():
    engine = create_async_engine(os.environ["SDF_TEST_DATABASE_URL"])
    unidade_id = uuid4()
    criado_em = datetime(2026, 10, 1, 12, 0)
    try:
        async with async_sessionmaker(engine, expire_on_commit=False)() as session:
            session.add(UnidadeModel(id=unidade_id, nome=f"Modelos {unidade_id}"))
            await session.flush()
            modelo = ModeloDispositivo(unidade_id, "S27 Ultra", "Flagship")
            modelo.created_at = modelo.updated_at = criado_em
            repository = ModeloDispositivoRepositoryImpl(session)
            await repository.adicionar(modelo)
            await session.flush()

            salvo = await repository.obter_por_id(unidade_id, modelo.id)
            assert salvo is not None
            salvo.atualizar_descricao(None)
            salvo.updated_at = datetime(2026, 10, 2, 9, 30)
            await repository.atualizar(salvo)
            await session.flush()
            session.expunge_all()

            editado = await repository.obter_por_id(unidade_id, modelo.id)
            assert editado is not None
            assert editado.descricao is None
            assert editado.created_at == criado_em
            assert editado.updated_at == datetime(2026, 10, 2, 9, 30)
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_obter_modelo_de_outra_unidade_retorna_none():
    engine = create_async_engine(os.environ["SDF_TEST_DATABASE_URL"])
    unidade_id, outra_unidade_id = uuid4(), uuid4()
    try:
        async with async_sessionmaker(engine, expire_on_commit=False)() as session:
            session.add_all(
                [
                    UnidadeModel(id=unidade_id, nome=f"Modelos {unidade_id}"),
                    UnidadeModel(id=outra_unidade_id, nome=f"Modelos {outra_unidade_id}"),
                ]
            )
            await session.flush()
            modelo = ModeloDispositivo(outra_unidade_id, "S27 Ultra")
            repository = ModeloDispositivoRepositoryImpl(session)
            await repository.adicionar(modelo)
            await session.flush()

            assert await repository.obter_por_id(unidade_id, modelo.id) is None
    finally:
        await engine.dispose()
