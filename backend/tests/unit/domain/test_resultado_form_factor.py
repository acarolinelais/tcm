from uuid import uuid4

import pytest
from src.domain.entities.resultado_form_factor import ResultadoFormFactor


def test_criar_resultado_guarda_execucao_modelo_e_valor():
    unidade_id, execucao_id, modelo_id = uuid4(), uuid4(), uuid4()

    resultado = ResultadoFormFactor(unidade_id, execucao_id, modelo_id, " PASS ")

    assert resultado.unidade_id == unidade_id
    assert resultado.execucao_sdf_id == execucao_id
    assert resultado.modelo_dispositivo_id == modelo_id
    assert resultado.resultado == "PASS"


def test_criar_resultado_vazio_levanta_erro():
    with pytest.raises(ValueError, match="obrigatório"):
        ResultadoFormFactor(uuid4(), uuid4(), uuid4(), "  ")
