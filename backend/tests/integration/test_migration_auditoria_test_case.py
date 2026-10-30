import os

import pytest
import sqlalchemy as sa
from alembic import command

pytestmark = pytest.mark.skipif(
    not os.environ.get("SDF_TEST_DATABASE_URL"),
    reason="Defina SDF_TEST_DATABASE_URL para executar a integração com Postgres.",
)

ANTERIOR = "e036a1b2c3d4"
REVISAO = "e038a1b2c3d4"


def _triggers_de_auditoria(connection) -> set[tuple[str, str]]:
    linhas = connection.execute(
        sa.text(
            "SELECT c.relname, t.tgname FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid "
            "WHERE NOT t.tgisinternal AND t.tgname LIKE 'auditoria%' "
            "AND c.relnamespace = current_schema()::regnamespace"
        )
    )
    return {(tabela, trigger) for tabela, trigger in linhas}


def test_migration_liga_a_auditoria_no_proprio_schema_e_desfaz_sem_sobras(schema_alembic):
    config, engine = schema_alembic.config, schema_alembic.engine
    command.upgrade(config, REVISAO)
    with engine.begin() as connection:
        assert _triggers_de_auditoria(connection) == {
            ("casos_teste", "auditoria_casos_teste"),
            ("links_pull_request", "auditoria_links_pull_request"),
            ("auditoria_alteracoes", "auditoria_imutavel"),
            ("auditoria_alteracoes", "auditoria_sem_truncate"),
        }
        assert sa.inspect(connection).has_table("auditoria_alteracoes")

    command.downgrade(config, ANTERIOR)
    with engine.begin() as connection:
        assert _triggers_de_auditoria(connection) == set()
        assert not sa.inspect(connection).has_table("auditoria_alteracoes")
        funcoes = connection.execute(
            sa.text(
                "SELECT count(*) FROM pg_proc WHERE proname LIKE 'auditoria%' "
                "AND pronamespace = current_schema()::regnamespace"
            )
        ).scalar_one()
        assert funcoes == 0


def _colunas_de_auditoria(connection) -> set[str]:
    return {coluna["name"] for coluna in sa.inspect(connection).get_columns("auditoria_alteracoes")}


def test_migration_de_nome_perfil_e_tela_acrescenta_e_remove_as_colunas(schema_alembic):
    config, engine = schema_alembic.config, schema_alembic.engine
    command.upgrade(config, "e038b1c2d3e4")
    with engine.begin() as connection:
        assert {"usuario_nome", "perfil_nome", "tela"} <= _colunas_de_auditoria(connection)

    command.downgrade(config, REVISAO)
    with engine.begin() as connection:
        assert not {"usuario_nome", "perfil_nome", "tela"} & _colunas_de_auditoria(connection)
        # A função volta à versão anterior e continua gravando.
        assert _triggers_de_auditoria(connection) >= {("casos_teste", "auditoria_casos_teste")}
