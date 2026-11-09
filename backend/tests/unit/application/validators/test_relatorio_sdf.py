from datetime import datetime
from io import BytesIO
from pathlib import Path

import pytest
from openpyxl import Workbook, load_workbook
from src.application.validators.relatorio_sdf import (
    RelatorioSdfInvalido,
    converter_data_f4,
    ler_relatorio_sdf,
    one_ui_do_caminho,
    sdf_id_do_nome,
    tc_id_do_script,
)

EXEMPLO = Path(__file__).parents[3] / "fixtures" / "sdf" / "123456-789012_0_Test_1_Detail.xlsx"
NOME = EXEMPLO.name
CABECALHO = [
    None,
    "Script Index ",
    "Script Name",
    " State",
    "Description",
    "Start Time",
    "End Time",
    "Result Folder ",
    "Test File Path ",
]


def relatorio(linhas, data="10/21/2026  \n6:43:35 PM", device="SM-S948B"):
    """Relatório no formato novo: cabeçalho geral nas linhas 3 e 4, resultados a partir da 8."""
    workbook = Workbook()
    planilha = workbook.active
    planilha["B2"], planilha["C2"] = "Ttile", "S26 - Keyboard - 21-10-26"
    titulos = ["Test Type", "Product Info", "Serial No.", "Agent Info", "Start Time", "End Time"]
    for coluna, titulo in zip("BCDEFG", titulos, strict=True):
        planilha[f"{coluna}3"] = titulo
    planilha["B4"], planilha["C4"], planilha["F4"], planilha["H4"] = "SCRIPT", device, data, "DONE"
    for indice, valor in enumerate(CABECALHO, start=1):
        planilha.cell(7, indice, valor)
    for numero, (script, estado, descricao, caminho) in enumerate(linhas, start=8):
        # Linha toda vazia fica vazia de verdade, sem o Script Index.
        indice = numero - 7 if script or estado else None
        valores = (indice, script, estado, descricao, caminho)
        for coluna, valor in zip((2, 3, 4, 5, 9), valores, strict=True):
            planilha.cell(numero, coluna, valor)
    conteudo = BytesIO()
    workbook.save(conteudo)
    return conteudo.getvalue()


def codigos(lido):
    return [(erro.codigo, erro.linha) for erro in lido.erros]


@pytest.mark.parametrize(
    ("nome", "esperado"),
    [
        ("123456-789012_0_Test_1_Detail.xlsx", "123456-789012"),
        ("C:/downloads/ABC-1_x.xlsx", "ABC-1"),
        ("Detail.xlsx", None),
        ("_0_Test_1_Detail.xlsx", None),
        (None, None),
    ],
)
def test_sdf_id_sai_do_nome_do_arquivo(nome, esperado):
    assert sdf_id_do_nome(nome) == esperado


def test_data_da_f4_aceita_espacos_e_quebra_de_linha():
    assert converter_data_f4("10/21/2026  \n6:43:35 PM") == datetime(2026, 10, 21, 18, 43, 35)
    assert converter_data_f4("1/2/2026 12:05:00 AM") == datetime(2026, 1, 2, 0, 5)
    assert converter_data_f4(datetime(2026, 10, 21, 18, 43)) == datetime(2026, 10, 21, 18, 43)


@pytest.mark.parametrize("valor", [None, "", "21/10/2026 18:43", "amanhã", "2026/10/21 \n18:44:03"])
def test_data_da_f4_invalida_vira_nula(valor):
    assert converter_data_f4(valor) is None


@pytest.mark.parametrize(
    ("caminho", "esperado"),
    [
        ("Keyboard_A_OneUI95.ts", "9.5"),
        ("Clock_A_OneUI10.ts", "10"),
        ("Clock_A_OneUI105.ts", "10.5"),
        ("Clock_oneui8.ts", "8"),
        ("Keyboard_A.ts", None),
        ("Keyboard_A_OneUI.ts", None),
        (None, None),
    ],
)
def test_one_ui_sai_dos_digitos_do_test_file_path(caminho, esperado):
    assert one_ui_do_caminho(caminho) == esperado


def test_tc_id_sem_a_extensao_py():
    assert tc_id_do_script("Keyboard_000001.py") == "Keyboard_000001"
    assert tc_id_do_script(" Keyboard_000001.PY ") == "Keyboard_000001"
    assert tc_id_do_script("Keyboard_000001") == "Keyboard_000001"


def test_le_o_exemplo_real_sem_a_linha_de_preparacao():
    lido = ler_relatorio_sdf(NOME, EXEMPLO.read_bytes())

    assert lido.erros == ()
    assert (lido.sdf_id, lido.device, lido.data_execucao) == (
        "123456-789012",
        "SM-S948B",
        datetime(2026, 10, 21, 18, 43, 35),
    )
    assert [linha.tc_id for linha in lido.linhas] == [f"Keyboard_{n:06d}" for n in range(1, 10)]
    primeira = lido.linhas[0]
    assert (primeira.linha, primeira.resultado, primeira.one_ui) == (9, "PASS", "9.5")
    assert primeira.descricao == "# PASS: Test case was executed successfully"


def test_aceita_qualquer_state_e_tira_setup_em_qualquer_posicao():
    caminho = "Keyboard_A_OneUI95.ts"
    lido = ler_relatorio_sdf(
        NOME,
        relatorio(
            [
                ("Keyboard_000001.py", "check", "", caminho),
                ("Setup.py", "PASS", "prepara", caminho),
                ("Keyboard_000002.py", "N/A", None, caminho),
                (None, None, None, None),
                ("Keyboard_000003.py", "FAIL", " falhou\t", caminho),
            ]
        ),
    )

    assert lido.erros == ()
    assert [(linha.tc_id, linha.resultado, linha.descricao) for linha in lido.linhas] == [
        ("Keyboard_000001", "check", None),
        ("Keyboard_000002", "N/A", None),
        ("Keyboard_000003", "FAIL", "falhou"),
    ]


def test_falha_planilha_no_formato_antigo_nao_e_aceita():
    conteudo = criar_planilha(
        [
            ["TEST ID", "SDF ID", "OneUI", "S27 ULTRA", "DATE"],
            ["Clock_000001", "12837-93482", "9.5", "PASS", datetime(2026, 3, 23)],
        ]
    )

    lido = ler_relatorio_sdf("12837-93482_antigo.xlsx", conteudo)

    assert codigos(lido) == [("sdf_formato_invalido", None)]
    assert lido.linhas == ()


def test_falha_arquivo_que_nao_e_excel():
    with pytest.raises(RelatorioSdfInvalido) as erro:
        ler_relatorio_sdf(NOME, b"isto nao e um xlsx")

    assert erro.value.erros[0].codigo == "arquivo_invalido"


def test_falha_nome_sem_sdf_id_f4_vazia_e_linhas_com_problema_saem_juntos():
    lido = ler_relatorio_sdf(
        "Detail.xlsx",
        relatorio(
            [
                ("Keyboard_000001.py", "PASS", "ok", "Keyboard_A.ts"),
                ("Keyboard_000002.py", None, "sem state", "Keyboard_A_OneUI95.ts"),
                ("Keyboard_000003.py", "PASS", "x" * 2001, "Keyboard_A_OneUI95.ts"),
                ("Keyboard_000004.py", "PASS", "ok", "Keyboard_A_OneUI95.ts"),
            ],
            data=None,
        ),
    )

    assert codigos(lido) == [
        ("sdf_nome_sem_id", None),
        ("sdf_data_invalida", None),
        ("sdf_one_ui_invalido", 8),
        ("valor_obrigatorio", 9),
        ("texto_muito_longo", 10),
    ]
    assert lido.erros[2].coluna == "Test File Path"
    assert lido.erros[3].coluna == "State"
    assert [linha.tc_id for linha in lido.linhas] == ["Keyboard_000004"]


def test_falha_sdf_id_longo_demais_diz_o_limite():
    lido = ler_relatorio_sdf(f"{'1' * 51}_Detail.xlsx", EXEMPLO.read_bytes())

    assert codigos(lido) == [("texto_muito_longo", None)]
    assert lido.erros[0].parametros == {"maximo": 50}
    assert lido.sdf_id is None


def test_falha_state_e_description_longos_saem_como_dois_erros():
    lido = ler_relatorio_sdf(
        NOME, relatorio([("Keyboard_000001.py", "P" * 41, "x" * 2001, "Keyboard_A_OneUI95.ts")])
    )

    assert [(erro.codigo, erro.coluna) for erro in lido.erros] == [
        ("texto_muito_longo", "State"),
        ("texto_muito_longo", "Description"),
    ]


def test_one_ui_vem_do_nome_do_arquivo_e_nao_da_pasta():
    assert one_ui_do_caminho("suites/OneUI8/Keyboard_A_OneUI95.ts") == "9.5"
    # Caminho do Windows: as barras invertidas também separam pastas, em qualquer sistema.
    assert one_ui_do_caminho(r"C:\suites\OneUI8\Keyboard_A_OneUI95.ts") == "9.5"
    assert sdf_id_do_nome(r"C:\Downloads\123456-789012_0_Test_1_Detail.xlsx") == "123456-789012"


def test_celula_perdida_bem_abaixo_da_tabela_nao_faz_ler_um_milhao_de_linhas():
    workbook = load_workbook(EXEMPLO)
    workbook.active["B1048576"] = "x"
    conteudo = BytesIO()
    workbook.save(conteudo)

    lido = ler_relatorio_sdf(NOME, conteudo.getvalue())

    assert lido.erros == ()
    assert len(lido.linhas) == 9


def test_formato_antigo_nao_acusa_o_device_da_celula_c4():
    conteudo = criar_planilha([["TEST ID", "SDF ID"], ["a", "b"], ["c", "d"], [None, None, "PASS"]])

    lido = ler_relatorio_sdf(NOME, conteudo)

    assert (lido.device, codigos(lido)) == ("", [("sdf_formato_invalido", None)])


def test_relatorio_sem_a_coluna_description_e_aceito():
    workbook = Workbook()
    planilha = workbook.active
    planilha["C4"], planilha["F4"] = "SM-S948B", "10/21/2026 6:43:35 PM"
    for coluna, titulo in ((3, "Script Name"), (4, "State"), (9, "Test File Path")):
        planilha.cell(7, coluna, titulo)
    for coluna, valor in ((3, "Keyboard_000001.py"), (4, "PASS"), (9, "Keyboard_A_OneUI95.ts")):
        planilha.cell(8, coluna, valor)
    conteudo = BytesIO()
    workbook.save(conteudo)

    lido = ler_relatorio_sdf(NOME, conteudo.getvalue())

    assert lido.erros == ()
    assert lido.linhas[0].descricao is None


def test_falha_so_linhas_de_preparacao_nao_tem_resultados():
    caminho = "Keyboard_A_OneUI95.ts"
    lido = ler_relatorio_sdf(
        NOME,
        relatorio(
            [
                ("HQ_precondition.py", "PASS", "", caminho),
                ("Setup.py", "PASS", "", caminho),
            ]
        ),
    )

    assert codigos(lido) == [("sdf_sem_resultados", None)]


def criar_planilha(linhas):
    workbook = Workbook()
    planilha = workbook.active
    for linha in linhas:
        planilha.append(linha)
    conteudo = BytesIO()
    workbook.save(conteudo)
    return conteudo.getvalue()
