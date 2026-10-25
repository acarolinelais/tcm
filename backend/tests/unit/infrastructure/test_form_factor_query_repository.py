from datetime import datetime
from unittest.mock import AsyncMock, Mock
from uuid import uuid4

from src.infrastructure.repositories.resultado_form_factor_repository import (
    ResultadoFormFactorRepositoryImpl,
)


async def test_query_form_factor_cruza_resultados_com_tc_execucao_e_modelo():
    session = AsyncMock()
    count_result = Mock()
    count_result.scalar_one.return_value = 1
    rows_result = Mock()
    rows_result.all.return_value = [
        ("Clock_001", "SDF-123", uuid4(), "S27 Ultra", "PASS", datetime(2026, 3, 23), "9.5")
    ]
    session.execute.side_effect = [count_result, rows_result]
    repo = ResultadoFormFactorRepositoryImpl(session)

    result = await repo.listar_form_factor_por_projeto(
        uuid4(), uuid4(), 2, 10, datetime(2026, 3, 16), datetime(2026, 3, 23), "9.5"
    )

    assert result.total_count == 1
    assert result.page == 2
    assert result.items[0].tc_id == "Clock_001"
    assert result.items[0].modelo_nome == "S27 Ultra"
    assert result.items[0].resultado == "PASS"
    for statement in (call.args[0] for call in session.execute.await_args_list):
        sql = str(statement.compile(compile_kwargs={"literal_binds": True}))
        assert "resultados_form_factor" in sql
        assert "execucoes_sdf" in sql
        assert "importacoes_sdf" in sql
