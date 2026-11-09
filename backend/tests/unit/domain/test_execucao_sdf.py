from datetime import UTC, datetime
from uuid import uuid4

import pytest
from src.domain.entities.execucao_sdf import ExecucaoSdf
from src.domain.entities.rodada_form_factor import RodadaFormFactor


def test_criar_execucao_preserva_dados_reportados():
    importacao_id, caso_id = uuid4(), uuid4()
    data = datetime(2026, 10, 23, tzinfo=UTC)

    execucao = ExecucaoSdf(uuid4(), importacao_id, caso_id, " 1234-123 ", data, " 9.5 ")

    assert execucao.importacao_sdf_id == importacao_id
    assert execucao.caso_teste_id == caso_id
    assert execucao.sdf_id == "1234-123"
    assert execucao.data_reportada == data
    assert execucao.one_ui == "9.5"
    assert execucao.origem == "SDF"


def test_criar_execucao_manual_sem_importacao_ou_sdf_id():
    execucao = ExecucaoSdf(uuid4(), None, uuid4(), None, datetime.now(UTC), "9.5", origem="MANUAL")

    assert execucao.importacao_sdf_id is None
    assert execucao.sdf_id is None
    assert execucao.origem == "MANUAL"


def test_criar_execucao_manual_com_sdf_id_levanta_erro():
    with pytest.raises(ValueError, match="Execução manual"):
        ExecucaoSdf(uuid4(), None, uuid4(), "SDF-1", datetime.now(UTC), "9.5", origem="MANUAL")


@pytest.mark.parametrize("sdf_id", [None, "", "   ", "SDF #1"])
def test_rodada_permite_sdf_id_livre_ate_cinquenta_caracteres(sdf_id):
    rodada = RodadaFormFactor(uuid4(), uuid4(), uuid4(), sdf_id, datetime.now(UTC))

    assert rodada.sdf_id == sdf_id


def test_rodada_recusa_sdf_id_com_mais_de_cinquenta_caracteres():
    with pytest.raises(ValueError, match="50 caracteres"):
        RodadaFormFactor(uuid4(), uuid4(), uuid4(), "x" * 51, datetime.now(UTC))


def test_execucao_manual_de_rodada_preserva_sdf_id_inclusive_espacos():
    rodada_id = uuid4()
    execucao = ExecucaoSdf(
        uuid4(), None, uuid4(), "  ", datetime.now(UTC), "9.5", origem="MANUAL", rodada_id=rodada_id
    )

    assert execucao.rodada_id == rodada_id
    assert execucao.sdf_id == "  "


@pytest.mark.parametrize("sdf_id,one_ui", [("", "9.5"), ("1", " ")])
def test_criar_execucao_sem_sdf_id_ou_one_ui_levanta_erro(sdf_id: str, one_ui: str):
    with pytest.raises(ValueError):
        ExecucaoSdf(uuid4(), uuid4(), uuid4(), sdf_id, datetime.now(UTC), one_ui)
