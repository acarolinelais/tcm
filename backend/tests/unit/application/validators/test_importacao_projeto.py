from io import BytesIO

import pytest
from openpyxl import Workbook
from src.application.validators.importacao_projeto import (
    PlanilhaProjetoInvalida,
    validar_planilha_projeto,
)
from src.domain.entities.caso_teste import (
    CategoriaCasoTeste,
    DificuldadeCasoTeste,
    SituacaoCasoTeste,
)

CABECALHO = [
    "App",
    "TC ID",
    "Difficulty",
    "Category",
    "TC Situation",
    "One UI",
    "Assignees",
    "Backup",
]


def gerar_planilha(linhas):
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.append(CABECALHO)
    for linha in linhas:
        worksheet.append(linha)
    conteudo = BytesIO()
    workbook.save(conteudo)
    return conteudo.getvalue()


def linha_caso(tc_id="Clock_001", **alteracoes):
    linha = {
        "App": "Clock",
        "TC ID": tc_id,
        "Difficulty": "Low",
        "Category": "A",
        "TC Situation": None,
        "One UI": "9.5",
        "Assignees": "ana@example.com",
        "Backup": "backup@example.com",
    }
    linha.update(alteracoes)
    return [linha[cabecalho] for cabecalho in CABECALHO]


def test_extrai_primeiro_app_e_one_ui_sem_validar_colunas_linha_a_linha():
    conteudo = gerar_planilha(
        [
            linha_caso(),
            linha_caso(
                "Clock_002",
                **{"App": "Weather", "One UI": "9.6", "Category": "B", "Difficulty": "Medium"},
            ),
        ]
    )

    resultado = validar_planilha_projeto(conteudo)

    assert resultado.app == "Clock"
    assert resultado.one_ui == "9.5"
    assert len(resultado.casos) == 2
    assert resultado.casos[0].situation is SituacaoCasoTeste.TO_DO
    assert resultado.casos[1].category is CategoriaCasoTeste.B
    assert resultado.casos[1].difficulty is DificuldadeCasoTeste.MEDIUM
    assert resultado.casos[0].responsavel == "ana@example.com"


@pytest.mark.parametrize(
    ("campo", "valor", "mensagem"),
    [
        ("TC ID", "", "TC ID é obrigatório"),
        ("Category", "D", "Use A, B ou C"),
        ("Difficulty", "Critical", "Use Low, Medium ou High"),
        ("TC Situation", "Blocked", "Use To-Do"),
        ("Assignees", "", "Responsável é obrigatório"),
        ("Backup", "", "Backup é obrigatório"),
    ],
)
def test_rejeita_campo_invalido_com_linha_e_motivo(campo, valor, mensagem):
    conteudo = gerar_planilha([linha_caso(**{campo: valor})])

    with pytest.raises(PlanilhaProjetoInvalida) as erro:
        validar_planilha_projeto(conteudo)

    assert any(item.linha == 2 and mensagem in item.mensagem for item in erro.value.erros)


def test_rejeita_tc_id_repetido_no_mesmo_arquivo():
    conteudo = gerar_planilha([linha_caso(), linha_caso()])

    with pytest.raises(PlanilhaProjetoInvalida) as erro:
        validar_planilha_projeto(conteudo)

    assert any(item.linha == 3 and "TC ID duplicado" in item.mensagem for item in erro.value.erros)


@pytest.mark.parametrize("campo", ["App", "One UI"])
def test_rejeita_planilha_sem_app_ou_one_ui(campo):
    conteudo = gerar_planilha([linha_caso(**{campo: ""})])

    with pytest.raises(PlanilhaProjetoInvalida) as erro:
        validar_planilha_projeto(conteudo)

    assert any(item.campo == campo.casefold() for item in erro.value.erros)


def test_rejeita_cabecalho_ou_arquivo_excel_invalido():
    with pytest.raises(PlanilhaProjetoInvalida, match="inválidos"):
        validar_planilha_projeto(b"not an xlsx")

    workbook = Workbook()
    workbook.active.append(["App"])
    conteudo = BytesIO()
    workbook.save(conteudo)
    with pytest.raises(PlanilhaProjetoInvalida) as erro:
        validar_planilha_projeto(conteudo.getvalue())
    assert any(item.linha == 1 for item in erro.value.erros)
