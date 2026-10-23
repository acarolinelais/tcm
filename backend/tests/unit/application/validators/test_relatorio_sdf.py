from datetime import datetime
from io import BytesIO

import pytest
from openpyxl import Workbook
from src.application.validators.importacao_projeto import PlanilhaProjetoInvalida
from src.application.validators.relatorio_sdf import validar_relatorio_sdf


def criar_planilha(linhas):
    workbook = Workbook()
    planilha = workbook.active
    for linha in linhas:
        planilha.append(linha)
    conteudo = BytesIO()
    workbook.save(conteudo)
    return conteudo.getvalue()


def test_valida_relatorio_com_multiplos_modelos_e_data_excel():
    conteudo = criar_planilha(
        [
            ["TEST ID", "SDF ID", "OneUI", "S27 ULTRA", "TAB S11", "DATE"],
            ["Clock_000001", "12837-93482", "9.5", "PASS", "FAIL", datetime(2026, 3, 23)],
        ]
    )

    resultado = validar_relatorio_sdf(conteudo)

    linha = resultado.linhas[0]
    assert linha.tc_id == "Clock_000001"
    assert linha.sdf_id == "12837-93482"
    assert linha.one_ui == "9.5"
    assert linha.resultados == {"s27 ultra": "PASS", "tab s11": "FAIL"}
    assert linha.data_reportada.date().isoformat() == "2026-03-23"


@pytest.mark.parametrize(
    ("coluna", "valor", "campo"),
    [(0, "", "tc id"), (1, "", "sdf id"), (2, "", "one ui"), (5, "", "date"), (3, "", "s27 ultra")],
)
def test_rejeita_campo_obrigatorio_vazio(coluna, valor, campo):
    linha = ["Clock_000001", "12837-93482", "9.5", "PASS", "PASS", datetime(2026, 3, 23)]
    linha[coluna] = valor
    conteudo = criar_planilha(
        [["TEST ID", "SDF ID", "OneUI", "S27 ULTRA", "TAB S11", "DATE"], linha]
    )

    with pytest.raises(PlanilhaProjetoInvalida) as erro:
        validar_relatorio_sdf(conteudo)

    assert any(item.campo == campo for item in erro.value.erros)


def test_rejeita_relatorio_sem_colunas_obrigatorias_ou_modelos():
    conteudo = criar_planilha([["TC ID"], ["Clock_001"]])

    with pytest.raises(PlanilhaProjetoInvalida) as erro:
        validar_relatorio_sdf(conteudo)

    assert {item.campo for item in erro.value.erros} >= {"sdf id", "date", "one ui", "modelos"}


@pytest.mark.parametrize(
    "cabecalho",
    [
        ["TEST ID", "TC ID", "SDF ID", "OneUI", "S27 ULTRA", "DATE"],
        ["TEST ID", "SDF ID", "OneUI", "S27 ULTRA", "s27 ultra", "DATE"],
    ],
)
def test_rejeita_cabecalhos_duplicados_apos_normalizar(cabecalho):
    conteudo = criar_planilha([cabecalho])

    with pytest.raises(PlanilhaProjetoInvalida) as erro:
        validar_relatorio_sdf(conteudo)

    assert any(item.mensagem == "O cabeçalho está duplicado." for item in erro.value.erros)
