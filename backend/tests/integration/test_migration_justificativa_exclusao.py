import os
from uuid import uuid4

import pytest
import sqlalchemy as sa
from alembic import command
from tests.integration.test_migration_status_in_validation import _inserir_caso, _status

pytestmark = pytest.mark.skipif(
    not os.environ.get("SDF_TEST_DATABASE_URL"),
    reason="Defina SDF_TEST_DATABASE_URL para executar a integração com Postgres.",
)

ANTERIOR = "f901a2b3c4d5"
REVISAO = "a1b2c3d4e5f8"


def _colunas(connection) -> set[str]:
    return {coluna["name"] for coluna in sa.inspect(connection).get_columns("casos_teste")}


def test_migration_justificativa_exclusao_mantem_excluidos_sem_texto(schema_alembic):
    config, schema_engine = schema_alembic.config, schema_alembic.engine
    command.upgrade(config, ANTERIOR)

    projeto_id = uuid4()
    with schema_engine.begin() as connection:
        time_id, unidade_id = connection.execute(
            sa.text("SELECT id, unidade_id FROM times LIMIT 1")
        ).one()
        responsavel_id, backup_id = connection.execute(
            sa.text("SELECT id FROM usuarios WHERE unidade_id = :unidade ORDER BY id LIMIT 2"),
            {"unidade": unidade_id},
        ).scalars()
        connection.execute(
            sa.text(
                "INSERT INTO projetos (id, unidade_id, time_id, nome, app, one_ui) "
                "VALUES (:id, :unidade, :time, 'Clock 9.5', 'Clock', '9.5')"
            ),
            {"id": projeto_id, "unidade": unidade_id, "time": time_id},
        )
        excluido = _inserir_caso(
            connection, projeto_id, responsavel_id, backup_id, "Clock_excluido", "Cancelled"
        )

    command.upgrade(config, REVISAO)
    with schema_engine.begin() as connection:
        assert _status(connection, excluido) == "Cancelled"
        assert (
            connection.execute(
                sa.text("SELECT justificativa_exclusao FROM casos_teste WHERE id = :id"),
                {"id": excluido},
            ).scalar_one()
            is None
        )

    command.downgrade(config, ANTERIOR)
    with schema_engine.begin() as connection:
        assert "justificativa_exclusao" not in _colunas(connection)
        assert _status(connection, excluido) == "Cancelled"
