from datetime import UTC, datetime
from uuid import uuid4

import pytest
from src.domain.entities.execucao_sdf import ExecucaoSdf


def test_criar_execucao_preserva_dados_reportados():
    importacao_id, caso_id = uuid4(), uuid4()
    data = datetime(2026, 10, 23, tzinfo=UTC)

    execucao = ExecucaoSdf(uuid4(), importacao_id, caso_id, " 1234-123 ", data, " 9.5 ")

    assert execucao.importacao_sdf_id == importacao_id
    assert execucao.caso_teste_id == caso_id
    assert execucao.sdf_id == "1234-123"
    assert execucao.data_reportada == data
    assert execucao.one_ui == "9.5"


@pytest.mark.parametrize("sdf_id,one_ui", [("", "9.5"), ("1", " ")])
def test_criar_execucao_sem_sdf_id_ou_one_ui_levanta_erro(sdf_id: str, one_ui: str):
    with pytest.raises(ValueError):
        ExecucaoSdf(uuid4(), uuid4(), uuid4(), sdf_id, datetime.now(UTC), one_ui)
