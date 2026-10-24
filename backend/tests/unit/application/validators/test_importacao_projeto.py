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
        "TC Situation": "New",
        "One UI": "9.5",
        "Assignees": "ana@example.com",
        "Backup": "backup@example.com",
    }
    linha.update(alteracoes)
    return [linha[cabecalho] for cabecalho in CABECALHO]


def validar_com_erro(conteudo):
    with pytest.raises(PlanilhaProjetoInvalida) as erro:
        validar_planilha_projeto(conteudo)
    return erro.value


def test_extrai_primeiro_app_e_one_ui_e_situation_de_cada_linha():
    conteudo = gerar_planilha(
        [
            linha_caso(),
            linha_caso(
                "Clock_002",
                **{
                    "App": "Weather",
                    "One UI": "9.6",
                    "Category": "B",
                    "Difficulty": "Medium",
                    "TC Situation": "new step",
                },
            ),
        ]
    )

    resultado = validar_planilha_projeto(conteudo)

    assert resultado.app == "Clock"
    assert resultado.one_ui == "9.5"
    assert resultado.total_linhas == 2
    assert resultado.casos[0].situation is SituacaoCasoTeste.NEW
    assert resultado.casos[1].situation is SituacaoCasoTeste.NEW_STEP
    assert resultado.casos[1].category is CategoriaCasoTeste.B
    assert resultado.casos[1].difficulty is DificuldadeCasoTeste.MEDIUM
    assert resultado.casos[0].responsavel == "ana@example.com"


def test_ignora_coluna_status():
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.append([*CABECALHO, "Status"])
    worksheet.append([*linha_caso(), "Pass"])
    conteudo = BytesIO()
    workbook.save(conteudo)

    resultado = validar_planilha_projeto(conteudo.getvalue())

    assert len(resultado.casos) == 1
    assert not hasattr(resultado.casos[0], "status")


@pytest.mark.parametrize(
    ("coluna", "valor", "codigo", "esperados"),
    [
        ("TC ID", "", "valor_obrigatorio", None),
        ("Category", "D", "valor_invalido", ["A", "B", "C"]),
        ("Difficulty", "Critical", "valor_invalido", ["Low", "Medium", "High"]),
        ("TC Situation", "To-Do", "valor_invalido", ["New", "New Step", "Without Changes"]),
        ("TC Situation", "", "valor_obrigatorio", None),
        ("Assignees", "", "valor_obrigatorio", None),
        ("Backup", "", "valor_obrigatorio", None),
    ],
)
def test_erro_de_linha_traz_codigo_coluna_valor_e_esperados(coluna, valor, codigo, esperados):
    erro = validar_com_erro(gerar_planilha([linha_caso(**{coluna: valor})]))

    item = next(item for item in erro.erros if item.coluna == coluna)
    assert item.linha == 2
    assert item.codigo == codigo
    assert item.valor == (valor or None)
    assert (item.parametros or {}).get("esperados") == esperados
    assert erro.total_linhas == 1


def test_varios_problemas_da_mesma_linha_sao_todos_reportados():
    erro = validar_com_erro(
        gerar_planilha([linha_caso(**{"TC Situation": "To-Do", "Category": "", "Backup": ""})])
    )

    assert {(item.linha, item.coluna) for item in erro.erros} == {
        (2, "TC Situation"),
        (2, "Category"),
        (2, "Backup"),
    }


def test_tc_id_repetido_informa_linha_em_que_apareceu_primeiro():
    erro = validar_com_erro(
        gerar_planilha([linha_caso(), linha_caso("Clock_002"), linha_caso(), linha_caso()])
    )

    duplicados = [item for item in erro.erros if item.codigo == "tc_id_duplicado"]
    assert [(item.linha, item.valor, item.parametros) for item in duplicados] == [
        (4, "Clock_001", {"primeira_linha": 2}),
        (5, "Clock_001", {"primeira_linha": 2}),
    ]


@pytest.mark.parametrize(
    ("coluna", "codigo"), [("App", "app_ausente"), ("One UI", "one_ui_ausente")]
)
def test_planilha_sem_app_ou_one_ui_gera_problema_geral(coluna, codigo):
    erro = validar_com_erro(gerar_planilha([linha_caso(**{coluna: ""})]))

    assert [(item.linha, item.coluna) for item in erro.erros if item.codigo == codigo] == [
        (None, coluna)
    ]


def test_planilha_sem_linhas_gera_problema_geral_sem_linha():
    erro = validar_com_erro(gerar_planilha([]))

    assert [(item.codigo, item.linha) for item in erro.erros] == [("sem_casos", None)]
    assert erro.total_linhas == 0


def test_coluna_obrigatoria_ausente_cita_o_nome_da_coluna():
    workbook = Workbook()
    workbook.active.append([c for c in CABECALHO if c != "TC Situation"])
    conteudo = BytesIO()
    workbook.save(conteudo)

    erro = validar_com_erro(conteudo.getvalue())

    assert [(item.codigo, item.linha, item.coluna) for item in erro.erros] == [
        ("coluna_obrigatoria_ausente", None, "TC Situation")
    ]


def test_arquivo_que_nao_e_excel_gera_problema_geral():
    erro = validar_com_erro(b"not an xlsx")

    assert [(item.codigo, item.linha) for item in erro.erros] == [("arquivo_invalido", None)]


def test_valida_planilha_com_mil_test_cases():
    conteudo = gerar_planilha([linha_caso(f"Clock_{indice:04}") for indice in range(1000)])

    resultado = validar_planilha_projeto(conteudo)

    assert len(resultado.casos) == 1000
    assert resultado.total_linhas == 1000
