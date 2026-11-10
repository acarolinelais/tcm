import os

import pytest
import sqlalchemy as sa
from alembic import command
from dotenv import load_dotenv

load_dotenv()

pytestmark = pytest.mark.skipif(
    not os.environ.get("SDF_TEST_DATABASE_URL"),
    reason="Defina SDF_TEST_DATABASE_URL para executar a integração com Postgres.",
)

ANTERIOR = "g071a1b2c3d4"
REVISAO = "g072a1b2c3d4"


def _colunas(connection, schema: str, tabela: str) -> dict[str, tuple[str, str | None]]:
    linhas = connection.execute(
        sa.text(
            "SELECT column_name, is_nullable, column_default FROM information_schema.columns "
            "WHERE table_schema = :schema AND table_name = :tabela"
        ),
        {"schema": schema, "tabela": tabela},
    )
    return {nome: (nulo, padrao) for nome, nulo, padrao in linhas}


def test_migration_cria_dev_fix_e_correcao_e_volta(schema_alembic):
    config, engine, schema = schema_alembic.config, schema_alembic.engine, schema_alembic.schema
    command.upgrade(config, REVISAO)

    with engine.connect() as connection:
        casos = _colunas(connection, schema, "casos_teste")
        status = _colunas(connection, schema, "importacoes_sdf_status")
    assert casos["dev_fix_id"][0] == "YES"
    assert casos["dev_fix_em"][0] == "YES"
    assert status["concluiu_correcao"] == ("NO", "false")

    command.downgrade(config, ANTERIOR)

    with engine.connect() as connection:
        assert "dev_fix_id" not in _colunas(connection, schema, "casos_teste")
        assert "concluiu_correcao" not in _colunas(connection, schema, "importacoes_sdf_status")
