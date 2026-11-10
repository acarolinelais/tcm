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


def test_descricao_sai_sem_espacos_e_tabs_e_vazia_vira_nula():
    com_tab = ResultadoFormFactor(uuid4(), uuid4(), uuid4(), "PASS", " # PASS: ok\t")
    vazia = ResultadoFormFactor(uuid4(), uuid4(), uuid4(), "PASS", " \t ")

    assert com_tab.descricao == "# PASS: ok"
    assert vazia.descricao is None
    assert ResultadoFormFactor(uuid4(), uuid4(), uuid4(), "PASS").descricao is None


def test_descricao_acima_do_limite_levanta_erro():
    with pytest.raises(ValueError, match="2000"):
        ResultadoFormFactor(uuid4(), uuid4(), uuid4(), "PASS", "x" * 2001)


def test_criar_resultado_vazio_levanta_erro():
    with pytest.raises(ValueError, match="obrigatório"):
        ResultadoFormFactor(uuid4(), uuid4(), uuid4(), "  ")


@pytest.mark.parametrize("resultado", ["FAIL", "EXCEPTION", "None", " fail ", "Timeout"])
def test_eh_falha_para_tudo_que_nao_passa(resultado):
    assert ResultadoFormFactor.eh_falha(resultado)


@pytest.mark.parametrize("resultado", ["PASS", "N/A", "NA", "Check", " pass ", "n/a\t"])
def test_eh_falha_falso_para_pass_na_e_check(resultado):
    assert not ResultadoFormFactor.eh_falha(resultado)
