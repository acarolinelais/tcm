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

ANTERIOR = "g072a1b2c3d4"
REVISAO = "g073a1b2c3d4"


def _colunas(connection, schema: str, tabela: str) -> dict[str, tuple[str, str | None]]:
    linhas = connection.execute(
        sa.text(
            "SELECT column_name, is_nullable, column_default FROM information_schema.columns "
            "WHERE table_schema = :schema AND table_name = :tabela"
        ),
        {"schema": schema, "tabela": tabela},
    )
    return {nome: (nulo, padrao) for nome, nulo, padrao in linhas}


def test_migration_cria_a_tentativa_de_correcao_e_volta(schema_alembic):
    config, engine, schema = schema_alembic.config, schema_alembic.engine, schema_alembic.schema
    command.upgrade(config, REVISAO)

    with engine.connect() as connection:
        casos = _colunas(connection, schema, "casos_teste")
        execucoes = _colunas(connection, schema, "execucoes_sdf")
    assert casos["tentativa_correcao"] == ("NO", "0")
    assert casos["correcao_em_revisao_em"][0] == "YES"
    assert execucoes["tentativa_correcao"][0] == "YES"

    command.downgrade(config, ANTERIOR)

    with engine.connect() as connection:
        assert "tentativa_correcao" not in _colunas(connection, schema, "casos_teste")
        assert "correcao_em_revisao_em" not in _colunas(connection, schema, "casos_teste")
        assert "tentativa_correcao" not in _colunas(connection, schema, "execucoes_sdf")
