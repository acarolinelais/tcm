import os
from uuid import uuid4

import pytest
import sqlalchemy as sa
from alembic import command
from sqlalchemy.exc import IntegrityError
from tests.integration.test_migration_status_in_validation import _inserir_caso

pytestmark = pytest.mark.skipif(
    not os.environ.get("SDF_TEST_DATABASE_URL"),
    reason="Defina SDF_TEST_DATABASE_URL para executar a integração com Postgres.",
)

ANTERIOR = "a1b2c3d4e5f8"
REVISAO = "a0b1c2d3e4f5"


def _nivel(connection, caso_id):
    return connection.execute(
        sa.text("SELECT automation_level FROM casos_teste WHERE id = :id"), {"id": caso_id}
    ).scalar_one()


def _definir_nivel(connection, caso_id, nivel):
    connection.execute(
        sa.text("UPDATE casos_teste SET automation_level = :nivel WHERE id = :id"),
        {"id": caso_id, "nivel": nivel},
    )


def test_migration_deixa_casos_existentes_sem_nivel_e_so_aceita_1_2_3_ou_nulo(schema_alembic):
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
        assert _nivel(connection, antigo) is None
        for nivel in (1, 2, 3, None):
            _definir_nivel(connection, antigo, nivel)
            assert _nivel(connection, antigo) == nivel

    with pytest.raises(IntegrityError, match="ck_casos_teste_automation_level"):
        with schema_engine.begin() as connection:
            _definir_nivel(connection, antigo, 4)

    command.downgrade(config, ANTERIOR)

    with schema_engine.connect() as connection:
        colunas = sa.inspect(connection).get_columns("casos_teste")
        assert "automation_level" not in {coluna["name"] for coluna in colunas}
