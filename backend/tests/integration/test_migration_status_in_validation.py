import os
from uuid import uuid4

import pytest
import sqlalchemy as sa
from alembic import command
from dotenv import load_dotenv
from sqlalchemy.exc import IntegrityError

load_dotenv()

pytestmark = pytest.mark.skipif(
    not os.environ.get("SDF_TEST_DATABASE_URL"),
    reason="Defina SDF_TEST_DATABASE_URL para executar a integração com Postgres.",
)

ANTERIOR = "a2b3c4d5e6f7"
REVISAO = "b3c4d5e6f708"


def _inserir_caso(connection, projeto_id, responsavel_id, backup_id, tc_id: str, status: str):
    caso_id = uuid4()
    connection.execute(
        sa.text(
            "INSERT INTO casos_teste (id, unidade_id, projeto_id, tc_id, category, difficulty, "
            "situation, status, responsavel_id, backup_id) "
            "SELECT :id, unidade_id, id, :tc_id, 'A', 'Low', 'New', :status, :responsavel, :backup "
            "FROM projetos WHERE id = :projeto"
        ),
        {
            "id": caso_id,
            "tc_id": tc_id,
            "status": status,
            "responsavel": responsavel_id,
            "backup": backup_id,
            "projeto": projeto_id,
        },
    )
    return caso_id


def _status(connection, caso_id) -> str:
    return connection.execute(
        sa.text("SELECT status FROM casos_teste WHERE id = :id"), {"id": caso_id}
    ).scalar_one()


def test_migration_aceita_in_validation_e_preserva_status_existentes(schema_alembic):
    assert os.environ.get("SENHA_INICIAL_USUARIOS")
    config, schema_engine = schema_alembic.config, schema_alembic.engine
    command.upgrade(config, ANTERIOR)

    projeto_id = uuid4()
    with schema_engine.begin() as connection:
        # O seed das migrations anteriores já traz times e usuários na mesma unidade.
        time_id, unidade_id = connection.execute(
            sa.text("SELECT id, unidade_id FROM times LIMIT 1")
        ).one()
        responsavel_id, backup_id = connection.execute(
            sa.text("SELECT id FROM usuarios WHERE unidade_id = :unidade ORDER BY id LIMIT 2"),
            {"unidade": unidade_id},
        ).scalars()
        connection.execute(
            sa.text(
                "INSERT INTO projetos (id, unidade_id, time_id, app, one_ui) "
                "VALUES (:id, :unidade, :time, 'Clock', '9.5')"
            ),
            {"id": projeto_id, "unidade": unidade_id, "time": time_id},
        )
        antigos = {
            status: _inserir_caso(
                connection, projeto_id, responsavel_id, backup_id, f"Clock_{status}", status
            )
            for status in ("To-Do", "InProgress", "InReview", "Pass", "Fail")
        }

    command.upgrade(config, REVISAO)

    with schema_engine.begin() as connection:
        assert {status: _status(connection, id) for status, id in antigos.items()} == {
            status: status for status in antigos
        }
        validando = _inserir_caso(
            connection, projeto_id, responsavel_id, backup_id, "Clock_validando", "InValidation"
        )
        assert _status(connection, validando) == "InValidation"

    with pytest.raises(IntegrityError, match="ck_casos_teste_status"):
        with schema_engine.begin() as connection:
            _inserir_caso(
                connection, projeto_id, responsavel_id, backup_id, "Clock_invalido", "Validation"
            )

    command.downgrade(config, ANTERIOR)

    with schema_engine.connect() as connection:
        assert _status(connection, validando) == "InReview"
        assert _status(connection, antigos["Pass"]) == "Pass"
