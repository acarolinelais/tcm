import os
from datetime import datetime
from uuid import uuid4

import pytest
import sqlalchemy as sa
from alembic import command
from tests.integration.test_migration_status_in_fixes import _executar
from tests.integration.test_migration_status_in_validation import _inserir_caso

pytestmark = pytest.mark.skipif(
    not os.environ.get("SDF_TEST_DATABASE_URL"),
    reason="Defina SDF_TEST_DATABASE_URL para executar a integração com Postgres.",
)

ANTERIOR = "g073a1b2c3d4"
REVISAO = "g076a1b2c3d4"


def test_migration_registra_a_tentativa_atual_dos_casos_em_correcao(schema_alembic):
    # CA-15: só a tentativa atual dos casos em correção; as fechadas não são reconstruídas.
    config, engine = schema_alembic.config, schema_alembic.engine
    command.upgrade(config, ANTERIOR)

    projeto_id, modelo_id = uuid4(), uuid4()
    with engine.begin() as connection:
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
        connection.execute(
            sa.text("INSERT INTO modelos_dispositivo (id, unidade_id, nome) VALUES (:id, :u, :n)"),
            {"id": modelo_id, "u": unidade_id, "n": f"S26 {modelo_id}"},
        )

        def caso(tc_id, status, tentativa):
            caso_id = _inserir_caso(
                connection, projeto_id, responsavel_id, backup_id, tc_id, status
            )
            connection.execute(
                sa.text("UPDATE casos_teste SET tentativa_correcao = :t WHERE id = :id"),
                {"t": tentativa, "id": caso_id},
            )
            return caso_id

        segunda = caso("Clock_segunda", "InFixes", 2)
        sem_falha = caso("Clock_sem_falha", "InProgress", 1)
        corrigido = caso("Clock_corrigido", "Done", 1)
        _executar(connection, segunda, unidade_id, modelo_id, datetime(2026, 11, 3), "FAIL")
        _executar(connection, segunda, unidade_id, modelo_id, datetime(2026, 11, 9), "EXCEPTION")
        connection.execute(
            sa.text(
                "UPDATE execucoes_sdf SET tentativa_correcao = "
                "CASE WHEN data_reportada > :corte THEN 2 ELSE 1 END WHERE caso_teste_id = :id"
            ),
            {"corte": datetime(2026, 11, 5), "id": segunda},
        )

    command.upgrade(config, REVISAO)

    with engine.connect() as connection:
        linhas = connection.execute(
            sa.text(
                "SELECT caso_teste_id, tentativa, origem, falha_em, resultado FROM correcoes "
                "WHERE ativo"
            )
        ).all()
    por_caso = {linha.caso_teste_id: linha for linha in linhas}
    assert set(por_caso) == {segunda, sem_falha}
    assert por_caso[segunda].tentativa == 2
    assert por_caso[segunda].falha_em == datetime(2026, 11, 9)
    assert por_caso[segunda].origem == "validacao"
    assert por_caso[segunda].resultado is None
    assert por_caso[sem_falha].falha_em is not None
    assert corrigido not in por_caso

    command.downgrade(config, ANTERIOR)

    with engine.connect() as connection:
        assert not connection.execute(
            sa.text(
                "SELECT 1 FROM information_schema.tables WHERE table_name = 'correcoes' "
                "AND table_schema = current_schema()"
            )
        ).first()
