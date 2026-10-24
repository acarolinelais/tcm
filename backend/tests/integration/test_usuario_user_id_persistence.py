import os
from uuid import uuid4

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from src.infrastructure.data.models.perfil_model import PerfilModel
from src.infrastructure.data.models.unidade_model import UnidadeModel
from src.infrastructure.data.models.usuario_model import UsuarioModel

pytestmark = pytest.mark.skipif(
    not os.environ.get("SDF_TEST_DATABASE_URL"),
    reason="Defina SDF_TEST_DATABASE_URL para executar a integração com Postgres.",
)


@pytest.mark.asyncio
async def test_user_id_e_unico_por_unidade_sem_diferenciar_caixa_e_permite_nulos():
    engine = create_async_engine(os.environ["SDF_TEST_DATABASE_URL"])
    unidade_a, unidade_b = uuid4(), uuid4()
    perfil_a, perfil_b = uuid4(), uuid4()
    try:
        async with async_sessionmaker(engine, expire_on_commit=False)() as session:
            async with session.begin():
                session.add_all(
                    [
                        UnidadeModel(id=unidade_a, nome=f"Unidade {unidade_a}"),
                        UnidadeModel(id=unidade_b, nome=f"Unidade {unidade_b}"),
                    ]
                )
                await session.flush()
                session.add_all(
                    [
                        PerfilModel(id=perfil_a, unidade_id=unidade_a, nome="Perfil A"),
                        PerfilModel(id=perfil_b, unidade_id=unidade_b, nome="Perfil B"),
                    ]
                )
                await session.flush()
                session.add_all(
                    [
                        UsuarioModel(
                            id=uuid4(),
                            unidade_id=unidade_a,
                            nome="Ana",
                            email=f"ana-{uuid4()}@example.com",
                            user_id="User-123",
                            perfil_id=perfil_a,
                        ),
                        UsuarioModel(
                            id=uuid4(),
                            unidade_id=unidade_a,
                            nome="Bia",
                            email=f"bia-{uuid4()}@example.com",
                            perfil_id=perfil_a,
                        ),
                        UsuarioModel(
                            id=uuid4(),
                            unidade_id=unidade_a,
                            nome="Cris",
                            email=f"cris-{uuid4()}@example.com",
                            perfil_id=perfil_a,
                        ),
                        UsuarioModel(
                            id=uuid4(),
                            unidade_id=unidade_b,
                            nome="Dani",
                            email=f"dani-{uuid4()}@example.com",
                            user_id="user-123",
                            perfil_id=perfil_b,
                        ),
                    ]
                )
                await session.flush()

                with pytest.raises(IntegrityError):
                    async with session.begin_nested():
                        session.add(
                            UsuarioModel(
                                id=uuid4(),
                                unidade_id=unidade_a,
                                nome="Eva",
                                email=f"eva-{uuid4()}@example.com",
                                user_id="USER-123",
                                perfil_id=perfil_a,
                            )
                        )
                        await session.flush()
    finally:
        await engine.dispose()
