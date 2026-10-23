import os
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from src.infrastructure.data.models.setor_model import SetorModel
from src.infrastructure.data.models.unidade_model import UnidadeModel
from src.infrastructure.repositories.setor_repository import SetorRepositoryImpl

pytestmark = pytest.mark.skipif(
    not os.environ.get("SDF_TEST_DATABASE_URL"),
    reason="Defina SDF_TEST_DATABASE_URL para executar a integração com Postgres.",
)


@pytest.mark.asyncio
async def test_obter_setor_de_outra_unidade_retorna_inexistente():
    engine = create_async_engine(os.environ["SDF_TEST_DATABASE_URL"])
    try:
        async with async_sessionmaker(engine, expire_on_commit=False)() as session:
            unidade_a = UnidadeModel(id=uuid4(), nome="Tenant A")
            unidade_b = UnidadeModel(id=uuid4(), nome="Tenant B")
            session.add_all([unidade_a, unidade_b])
            await session.flush()
            setor_b = SetorModel(id=uuid4(), unidade_id=unidade_b.id, nome="Setor B")
            session.add(setor_b)
            await session.flush()

            repo = SetorRepositoryImpl(session)
            assert await repo.obter_por_id(unidade_a.id, setor_b.id) is None
            assert (await repo.obter_por_id(unidade_b.id, setor_b.id)).id == setor_b.id
    finally:
        await engine.dispose()
