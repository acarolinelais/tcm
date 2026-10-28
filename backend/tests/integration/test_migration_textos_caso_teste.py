import os
from uuid import uuid4

import pytest
import sqlalchemy as sa
from alembic import command
from tests.integration.test_migration_status_in_validation import _inserir_caso

pytestmark = pytest.mark.skipif(
    not os.environ.get("SDF_TEST_DATABASE_URL"),
    reason="Defina SDF_TEST_DATABASE_URL para executar a integração com Postgres.",
)

ANTERIOR = "a0b1c2d3e4f5"
REVISAO = "c028a1b2c3d4"
TEXTOS = ("title", "precondition", "procedure", "expected_result")


def test_migration_deixa_casos_existentes_sem_textos_e_downgrade_remove_as_colunas(
    schema_alembic,
):
    config, schema_engine = schema_alembic.config, schema_alembic.engine
    command.upgrade(config, ANTERIOR)

    with schema_engine.begin() as connection:
        time_id, unidade_id = connection.execute(
            sa.text("SELECT id, unidade_id FROM times LIMIT 1")
        ).one()
        responsavel_id, backup_id = connection.execute(
            sa.text("SELECT id FROM usuarios WHERE unidade_id = :unidade ORDER BY id LIMIT 2"),
            {"unidade": unidade_id},
        ).scalars()
        projeto_id = uuid4()
        connection.execute(
            sa.text(
                "INSERT INTO projetos (id, unidade_id, time_id, nome, app, one_ui) "
                "VALUES (:id, :unidade, :time, 'Clock 9.5', 'Clock', '9.5')"
            ),
            {"id": projeto_id, "unidade": unidade_id, "time": time_id},
        )
        antigo = _inserir_caso(
            connection, projeto_id, responsavel_id, backup_id, "Clock_antigo", "To-Do"
        )

    command.upgrade(config, REVISAO)

    with schema_engine.begin() as connection:
        textos = connection.execute(
            sa.text(f"SELECT {', '.join(TEXTOS)} FROM casos_teste WHERE id = :id"),
            {"id": antigo},
        ).one()
        assert tuple(textos) == (None, None, None, None)

    command.downgrade(config, ANTERIOR)

    with schema_engine.connect() as connection:
        colunas = {coluna["name"] for coluna in sa.inspect(connection).get_columns("casos_teste")}
        assert colunas.isdisjoint(TEXTOS)
