import os
from uuid import uuid4

import pytest
import sqlalchemy as sa
from alembic import command
from dotenv import load_dotenv

load_dotenv()

pytestmark = pytest.mark.skipif(
    not os.environ.get("SDF_TEST_DATABASE_URL"),
    reason="Defina SDF_TEST_DATABASE_URL para executar a integração com Postgres.",
)

ANTERIOR = "f1a2b3c4d5e6"
REVISAO = "a2b3c4d5e6f7"
PERMISSAO = "modelos_dispositivo.gerenciar"


def _perfis_com_permissao(connection) -> set[str]:
    return set(
        connection.execute(
            sa.text(
                "SELECT p.codigo FROM perfil_permissoes pp "
                "JOIN perfis p ON p.id = pp.perfil_id WHERE pp.permissao_id = :permissao"
            ),
            {"permissao": PERMISSAO},
        ).scalars()
    )


def _auth_versions(connection, codigo: str) -> dict[str, int]:
    return dict(
        connection.execute(
            sa.text(
                "SELECT u.id::text, u.auth_version FROM usuarios u "
                "JOIN perfis p ON p.id = u.perfil_id WHERE p.codigo = :codigo"
            ),
            {"codigo": codigo},
        ).all()
    )


def test_migration_preserva_modelos_e_concede_gestao_somente_ao_kp(schema_alembic):
    assert os.environ.get("SENHA_INICIAL_USUARIOS")
    config, schema_engine = schema_alembic.config, schema_alembic.engine
    command.upgrade(config, ANTERIOR)

    modelo_id = uuid4()
    with schema_engine.begin() as connection:
        connection.execute(
            sa.text(
                "INSERT INTO modelos_dispositivo (id, unidade_id, nome) "
                "SELECT :id, id, 'S27 Ultra' FROM unidades WHERE nome = 'Manaus'"
            ),
            {"id": modelo_id},
        )
        kp_antes = _auth_versions(connection, "KP")
        gerentes_antes = _auth_versions(connection, "GERENTE")

    command.upgrade(config, REVISAO)

    with schema_engine.connect() as connection:
        nome, descricao, ativo, created_at, updated_at = connection.execute(
            sa.text(
                "SELECT nome, descricao, ativo, created_at, updated_at "
                "FROM modelos_dispositivo WHERE id = :id"
            ),
            {"id": modelo_id},
        ).one()
        assert (nome, descricao, ativo) == ("S27 Ultra", None, True)
        assert updated_at == created_at
        assert _perfis_com_permissao(connection) == {"KP"}
        assert kp_antes
        assert _auth_versions(connection, "KP") == {
            id: versao + 1 for id, versao in kp_antes.items()
        }
        assert _auth_versions(connection, "GERENTE") == gerentes_antes

    command.downgrade(config, ANTERIOR)

    with schema_engine.connect() as connection:
        colunas = set(
            connection.execute(
                sa.text(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_schema = :schema AND table_name = 'modelos_dispositivo'"
                ),
                {"schema": schema_alembic.schema},
            ).scalars()
        )
        assert "descricao" not in colunas
        assert _perfis_com_permissao(connection) == set()
        assert _auth_versions(connection, "KP") == {
            id: versao + 2 for id, versao in kp_antes.items()
        }
