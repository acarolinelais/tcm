import os
from uuid import uuid4

import pytest
import sqlalchemy as sa
from alembic import command
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from src.domain.common.cor_avatar import CorAvatar
from src.infrastructure.data.models.perfil_model import PerfilModel
from src.infrastructure.data.models.unidade_model import UnidadeModel
from src.infrastructure.data.models.usuario_model import UsuarioModel
from src.infrastructure.repositories.usuario_repository import UsuarioRepositoryImpl

pytestmark = pytest.mark.skipif(
    not os.environ.get("SDF_TEST_DATABASE_URL"),
    reason="Defina SDF_TEST_DATABASE_URL para executar a integração com Postgres.",
)

ANTERIOR = "d030a1b2c3d4"
REVISAO = "e036a1b2c3d4"


def _colunas(connection) -> set[str]:
    return {coluna["name"] for coluna in sa.inspect(connection).get_columns("usuarios")}


def test_migration_cor_avatar_deixa_contas_existentes_em_azul_e_recusa_cor_fora_da_paleta(
    schema_alembic,
):
    config, schema_engine = schema_alembic.config, schema_alembic.engine
    command.upgrade(config, ANTERIOR)
    with schema_engine.begin() as connection:
        existentes = connection.execute(sa.text("SELECT count(*) FROM usuarios")).scalar_one()
    assert existentes > 0

    command.upgrade(config, REVISAO)
    with schema_engine.begin() as connection:
        cores = connection.execute(sa.text("SELECT DISTINCT cor_avatar FROM usuarios")).scalars()
        assert set(cores) == {"azul"}
        usuario_id = connection.execute(sa.text("SELECT id FROM usuarios LIMIT 1")).scalar_one()
        connection.execute(
            sa.text("UPDATE usuarios SET cor_avatar = 'verde' WHERE id = :id"), {"id": usuario_id}
        )

    with pytest.raises(IntegrityError), schema_engine.begin() as connection:
        connection.execute(
            sa.text("UPDATE usuarios SET cor_avatar = 'dourado' WHERE id = :id"),
            {"id": usuario_id},
        )

    command.downgrade(config, ANTERIOR)
    with schema_engine.begin() as connection:
        assert "cor_avatar" not in _colunas(connection)


@pytest.mark.asyncio
async def test_trocar_a_cor_de_uma_conta_nao_altera_outra_da_mesma_unidade():
    engine = create_async_engine(os.environ["SDF_TEST_DATABASE_URL"])
    unidade_id, perfil_id, ana_id, bia_id = uuid4(), uuid4(), uuid4(), uuid4()
    sessoes = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with sessoes() as session, session.begin():
            session.add(UnidadeModel(id=unidade_id, nome=f"Unidade {unidade_id}"))
            await session.flush()
            session.add(PerfilModel(id=perfil_id, unidade_id=unidade_id, nome="Perfil"))
            await session.flush()
            session.add_all(
                [
                    UsuarioModel(
                        id=usuario_id,
                        unidade_id=unidade_id,
                        nome=nome,
                        email=f"{nome}-{uuid4()}@example.com",
                        perfil_id=perfil_id,
                    )
                    for usuario_id, nome in ((ana_id, "ana"), (bia_id, "bia"))
                ]
            )

        async with sessoes() as session, session.begin():
            repo = UsuarioRepositoryImpl(session)
            ana = await repo.obter_por_id(unidade_id, ana_id)
            assert ana is not None and ana.cor_avatar == CorAvatar.AZUL
            ana.definir_cor_avatar(CorAvatar.VERDE)
            await repo.atualizar(ana)

        async with sessoes() as session:
            repo = UsuarioRepositoryImpl(session)
            assert (await repo.obter_por_id(unidade_id, ana_id)).cor_avatar == CorAvatar.VERDE
            assert (await repo.obter_por_id(unidade_id, bia_id)).cor_avatar == CorAvatar.AZUL
    finally:
        async with sessoes() as session, session.begin():
            for model in (UsuarioModel, PerfilModel):
                await session.execute(sa.delete(model).where(model.unidade_id == unidade_id))
            await session.execute(sa.delete(UnidadeModel).where(UnidadeModel.id == unidade_id))
        await engine.dispose()
