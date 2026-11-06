import os
from datetime import datetime
from uuid import uuid4

import pytest
import sqlalchemy as sa
from alembic import command
from sqlalchemy.exc import IntegrityError
from tests.integration.test_migration_status_in_validation import _inserir_caso, _status

pytestmark = pytest.mark.skipif(
    not os.environ.get("SDF_TEST_DATABASE_URL"),
    reason="Defina SDF_TEST_DATABASE_URL para executar a integração com Postgres.",
)

ANTERIOR = "e8f901a2b3c4"
REVISAO = "f901a2b3c4d5"


def _executar(connection, caso_id, unidade_id, modelo_id, data, resultado, importacao_id=None):
    execucao_id = uuid4()
    connection.execute(
        sa.text(
            "INSERT INTO execucoes_sdf (id, unidade_id, caso_teste_id, data_reportada, one_ui, "
            "origem, importacao_sdf_id, sdf_id) VALUES (:id, :unidade, :caso, :data, '9.5', "
            ":origem, :importacao, :sdf_id)"
        ),
        {
            "id": execucao_id,
            "unidade": unidade_id,
            "caso": caso_id,
            "data": data,
            "origem": "SDF" if importacao_id else "MANUAL",
            "importacao": importacao_id,
            "sdf_id": "SDF-1" if importacao_id else None,
        },
    )
    connection.execute(
        sa.text(
            "INSERT INTO resultados_form_factor (id, unidade_id, execucao_sdf_id, "
            "modelo_dispositivo_id, resultado) VALUES (:id, :unidade, :execucao, :modelo, :valor)"
        ),
        {
            "id": uuid4(),
            "unidade": unidade_id,
            "execucao": execucao_id,
            "modelo": modelo_id,
            "valor": resultado,
        },
    )


def test_migration_move_revisao_com_fail_recente_para_in_fixes(schema_alembic):
    config, schema_engine = schema_alembic.config, schema_alembic.engine
    command.upgrade(config, ANTERIOR)

    projeto_id, modelo_id = uuid4(), uuid4()
    antiga, recente = datetime(2026, 10, 1), datetime(2026, 10, 20)
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
        connection.execute(
            sa.text(
                "INSERT INTO modelos_dispositivo (id, unidade_id, nome) "
                "VALUES (:id, :unidade, :nome)"
            ),
            {"id": modelo_id, "unidade": unidade_id, "nome": f"S26 {modelo_id}"},
        )

        def caso(tc_id, status="InReview"):
            return _inserir_caso(connection, projeto_id, responsavel_id, backup_id, tc_id, status)

        com_fail, corrigido, sem_execucao, validando = (
            caso("Clock_fail"),
            caso("Clock_corrigido"),
            caso("Clock_sem_execucao"),
            caso("Clock_validando", "InValidation"),
        )
        _executar(connection, com_fail, unidade_id, modelo_id, antiga, "PASS")
        _executar(connection, com_fail, unidade_id, modelo_id, recente, " Fail ")
        _executar(connection, corrigido, unidade_id, modelo_id, antiga, "FAIL")
        _executar(connection, corrigido, unidade_id, modelo_id, recente, "PASS")
        _executar(connection, validando, unidade_id, modelo_id, recente, "FAIL")
        # O FAIL mais recente veio de uma importação removida: não conta, como no Resumo.
        importacao_removida, removida = uuid4(), caso("Clock_importacao_removida")
        connection.execute(
            sa.text(
                "INSERT INTO importacoes_sdf (id, unidade_id, projeto_id, importado_por, ativo) "
                "VALUES (:id, :unidade, :projeto, :usuario, false)"
            ),
            {
                "id": importacao_removida,
                "unidade": unidade_id,
                "projeto": projeto_id,
                "usuario": responsavel_id,
            },
        )
        _executar(connection, removida, unidade_id, modelo_id, antiga, "PASS")
        _executar(connection, removida, unidade_id, modelo_id, recente, "Fail", importacao_removida)

    command.upgrade(config, REVISAO)

    with schema_engine.connect() as connection:
        assert [
            _status(connection, id)
            for id in (com_fail, corrigido, sem_execucao, validando, removida)
        ] == ["InFixes", "InReview", "InReview", "InValidation", "InReview"]

    with pytest.raises(IntegrityError, match="ck_casos_teste_status"):
        with schema_engine.begin() as connection:
            _inserir_caso(
                connection, projeto_id, responsavel_id, backup_id, "Clock_invalido", "Fixes"
            )

    command.downgrade(config, ANTERIOR)

    with schema_engine.connect() as connection:
        assert _status(connection, com_fail) == "InReview"
