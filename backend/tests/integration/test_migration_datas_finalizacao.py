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

ANTERIOR = "f060a1b2c3d4"
REVISAO = "g065a1b2c3d4"


def _datas(connection, caso_id):
    return connection.execute(
        sa.text("SELECT code_done_em, all_passed_em FROM casos_teste WHERE id = :id"),
        {"id": caso_id},
    ).one()


def _mudar_status(connection, caso_id, status):
    connection.execute(
        sa.text("UPDATE casos_teste SET status = :status WHERE id = :id"),
        {"status": status, "id": caso_id},
    )


def _primeira_in_review(connection, caso_id):
    return connection.execute(
        sa.text(
            "SELECT MIN(created_at) AT TIME ZONE 'UTC' FROM auditoria_alteracoes "
            "WHERE row_id = :id AND new_values ->> 'status' = 'InReview'"
        ),
        {"id": caso_id},
    ).scalar_one()


def test_migration_preenche_as_datas_pelo_historico(schema_alembic):
    config, schema_engine = schema_alembic.config, schema_alembic.engine
    command.upgrade(config, ANTERIOR)

    projeto_id, s948, s1234 = uuid4(), uuid4(), uuid4()
    antiga, recente = datetime(2026, 11, 5, 9), datetime(2026, 11, 6, 8)
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
        for modelo_id in (s948, s1234):
            connection.execute(
                sa.text(
                    "INSERT INTO modelos_dispositivo (id, unidade_id, nome) "
                    "VALUES (:id, :unidade, :nome)"
                ),
                {"id": modelo_id, "unidade": unidade_id, "nome": f"SM-{modelo_id}"},
            )
            connection.execute(
                sa.text(
                    "INSERT INTO projeto_modelos (id, unidade_id, projeto_id, "
                    "modelo_dispositivo_id) VALUES (:id, :unidade, :projeto, :modelo)"
                ),
                {"id": uuid4(), "unidade": unidade_id, "projeto": projeto_id, "modelo": modelo_id},
            )

        def caso(tc_id, status="InProgress"):
            return _inserir_caso(connection, projeto_id, responsavel_id, backup_id, tc_id, status)

        # Entrou em In Review, voltou e entrou de novo: vale a primeira (RN-02).
        revisado = caso("Clock_revisado")
        _mudar_status(connection, revisado, "InReview")
        _mudar_status(connection, revisado, "InProgress")
        _mudar_status(connection, revisado, "InReview")
        nunca_revisado = caso("Clock_nunca_revisado")
        _mudar_status(connection, nunca_revisado, "InValidation")
        # Em In Review sem registro na auditoria (mudança anterior à spec 038): fica vazio (CA-11).
        connection.execute(sa.text("ALTER TABLE casos_teste DISABLE TRIGGER auditoria_casos_teste"))
        sem_historico = caso("Clock_sem_historico", "InReview")
        connection.execute(sa.text("ALTER TABLE casos_teste ENABLE TRIGGER auditoria_casos_teste"))

        # Último resultado dos dois devices PASS: fecha na data mais recente (RN-03, RN-05).
        _executar(connection, revisado, unidade_id, s948, antiga, "PASS")
        _executar(connection, revisado, unidade_id, s1234, antiga, "FAIL")
        _executar(connection, revisado, unidade_id, s1234, recente, " pass ")
        # Um device só: não fecha (CA-07).
        _executar(connection, nunca_revisado, unidade_id, s948, recente, "PASS")
        # O último resultado de um device é FAIL: não fecha (CA-05).
        _executar(connection, sem_historico, unidade_id, s948, antiga, "PASS")
        _executar(connection, sem_historico, unidade_id, s1234, antiga, "PASS")
        _executar(connection, sem_historico, unidade_id, s1234, recente, "FAIL")
        primeira = _primeira_in_review(connection, revisado)
        auditoria_antes = connection.execute(
            sa.text("SELECT COUNT(*) FROM auditoria_alteracoes")
        ).scalar_one()

    command.upgrade(config, REVISAO)

    with schema_engine.connect() as connection:
        assert _datas(connection, revisado) == (primeira, recente)
        assert _datas(connection, nunca_revisado) == (None, None)
        assert _datas(connection, sem_historico) == (None, None)
        # O retroativo não entra no histórico.
        assert (
            connection.execute(sa.text("SELECT COUNT(*) FROM auditoria_alteracoes")).scalar_one()
            == auditoria_antes
        )

    with schema_engine.begin() as connection:
        _mudar_status(connection, nunca_revisado, "InReview")
        connection.execute(
            sa.text("UPDATE casos_teste SET code_done_em = now() WHERE id = :id"),
            {"id": nunca_revisado},
        )
        ultima = connection.execute(
            sa.text(
                "SELECT changed_fields FROM auditoria_alteracoes WHERE row_id = :id "
                "ORDER BY created_at DESC LIMIT 1"
            ),
            {"id": nunca_revisado},
        ).scalar_one()
    # A mudança de Status continua no histórico; a data calculada, não.
    assert ultima == ["status"]

    command.downgrade(config, ANTERIOR)

    with schema_engine.connect() as connection:
        colunas = connection.execute(
            sa.text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = 'casos_teste' AND table_schema = current_schema()"
            )
        ).scalars()
        assert not {"code_done_em", "all_passed_em"} & set(colunas)
