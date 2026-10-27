from datetime import datetime
from unittest.mock import AsyncMock, Mock
from uuid import uuid4

from src.infrastructure.repositories.resultado_form_factor_repository import (
    ResultadoFormFactorRepositoryImpl,
)


def _result(scalar=None, rows=()):
    result = Mock()
    result.scalar_one.return_value = scalar
    result.all.return_value = list(rows)
    return result


async def test_query_form_factor_monta_uma_linha_por_caso_com_resultado_por_modelo():
    caso_id, responsavel_id, backup_id, rodada_id, s25, s26 = (uuid4() for _ in range(6))
    importado_em = datetime(2026, 3, 24)
    session = AsyncMock()
    session.execute.side_effect = [
        _result(scalar=1),
        _result(rows=[(caso_id, "Clock_001", responsavel_id, backup_id)]),
        _result(rows=[(caso_id, rodada_id, None, False)]),
        _result(
            rows=[
                (caso_id, s25, "Pass", "SDF-1", datetime(2026, 3, 20), importado_em),
                (caso_id, s26, "Fail", "SDF-2", datetime(2026, 3, 23), importado_em),
            ]
        ),
    ]
    repo = ResultadoFormFactorRepositoryImpl(session)

    result = await repo.listar_form_factor_por_projeto(
        uuid4(), uuid4(), 2, 10, datetime(2026, 3, 16), datetime(2026, 3, 23), [responsavel_id]
    )

    assert result.total_count == 1
    assert result.page == 2
    linha = result.items[0]
    assert (linha.tc_id, linha.responsavel_id) == ("Clock_001", responsavel_id)
    assert linha.resultados == {s25: "Pass", s26: "Fail"}
    assert (linha.sdf_id, linha.data_reportada) == ("SDF-2", datetime(2026, 3, 23))
    assert (linha.backup_id, linha.rodada_pendente_id) == (backup_id, rodada_id)


async def test_query_form_factor_sem_casos_nao_consulta_resultados():
    session = AsyncMock()
    session.execute.side_effect = [_result(scalar=0), _result(rows=[])]
    repo = ResultadoFormFactorRepositoryImpl(session)

    result = await repo.listar_form_factor_por_projeto(uuid4(), uuid4(), 1, 20)

    assert result.items == []
    assert result.total_count == 0
    assert session.execute.await_count == 2
