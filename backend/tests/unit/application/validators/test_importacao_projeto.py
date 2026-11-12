from datetime import date, datetime
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
    NivelAutomacaoCasoTeste,
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


CABECALHO_COMPLETO = [
    "App",
    "TC ID",
    "Title(English)",
    "Test Precondition(English)",
    "Test Procedure(English)",
    "Expected Result(English)",
    "Difficulty",
    "Category",
    "Automation Level",
    "TC Situation",
    "One UI",
    "Assignees",
    "Backup",
]


# Gerador do modelo atual (13 colunas, ordem e cabeçalho variáveis). Os helpers acima são do modelo
# antigo, fixo em 8 colunas, e os testes antigos continuam usando-os.
def gerar_planilha_completa(linhas, cabecalho=CABECALHO_COMPLETO):
    """Planilha no modelo atual: cada linha é um dict por coluna; o que faltar usa o valor-base."""
    base = {
        "App": "Clock",
        "TC ID": "Clock_001",
        "Title(English)": "Titulo",
        "Test Precondition(English)": "Pre",
        "Test Procedure(English)": "Passos",
        "Expected Result(English)": "Resultado",
        "Difficulty": "Low",
        "Category": "A",
        "Automation Level": None,
        "TC Situation": "New",
        "One UI": "9.5",
        "Assignees": "ana@example.com",
        "Backup": "backup@example.com",
    }
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.append(cabecalho)
    for linha in linhas:
        valores = {**base, **linha}
        worksheet.append([valores.get(coluna) for coluna in cabecalho])
    conteudo = BytesIO()
    workbook.save(conteudo)
    return conteudo.getvalue()


def test_automation_level_1_2_e_3_chegam_em_cada_linha():
    planilha = validar_planilha_projeto(
        gerar_planilha_completa(
            [
                {"TC ID": "Clock_001", "Automation Level": 1},
                {"TC ID": "Clock_002", "Automation Level": 2},
                {"TC ID": "Clock_003", "Automation Level": 3},
            ]
        )
    )

    assert [caso.automation_level for caso in planilha.casos] == [
        NivelAutomacaoCasoTeste.NAO_AUTOMATIZAVEL,
        NivelAutomacaoCasoTeste.PARCIALMENTE_AUTOMATIZAVEL,
        NivelAutomacaoCasoTeste.TOTALMENTE_AUTOMATIZAVEL,
    ]


def test_colunas_em_outra_ordem_e_colunas_extras_nao_mudam_o_resultado():
    cabecalho = list(reversed(CABECALHO_COMPLETO))

    planilha = validar_planilha_projeto(
        gerar_planilha_completa([{"Automation Level": 2, "Category": "B"}], cabecalho)
    )

    caso = planilha.casos[0]
    assert (caso.tc_id, caso.category, caso.difficulty) == (
        "Clock_001",
        CategoriaCasoTeste.B,
        DificuldadeCasoTeste.LOW,
    )
    assert caso.automation_level is NivelAutomacaoCasoTeste.PARCIALMENTE_AUTOMATIZAVEL
    assert caso.responsavel == "ana@example.com"
    assert planilha.app == "Clock"
    assert planilha.one_ui == "9.5"


def test_planilha_sem_a_coluna_automation_level_importa_com_nivel_vazio():
    cabecalho = [coluna for coluna in CABECALHO_COMPLETO if coluna != "Automation Level"]

    planilha = validar_planilha_projeto(
        gerar_planilha_completa([{}, {"TC ID": "Clock_002"}], cabecalho)
    )

    assert [caso.automation_level for caso in planilha.casos] == [None, None]


def test_celula_vazia_importa_nivel_vazio_sem_afetar_as_outras_linhas():
    planilha = validar_planilha_projeto(
        gerar_planilha_completa(
            [
                {"TC ID": "Clock_001", "Automation Level": None},
                {"TC ID": "Clock_002", "Automation Level": "   "},
                {"TC ID": "Clock_003", "Automation Level": 3},
            ]
        )
    )

    assert [caso.automation_level for caso in planilha.casos] == [
        None,
        None,
        NivelAutomacaoCasoTeste.TOTALMENTE_AUTOMATIZAVEL,
    ]


@pytest.mark.parametrize(
    "valor,esperado",
    [(1, 1), (2.0, 2), ("3", 3), ("1.0", 1), (" 2 ", 2), ("3.00", 3), ("02", 2)],
)
def test_valores_numericos_do_excel_viram_o_inteiro_correspondente(valor, esperado):
    planilha = validar_planilha_projeto(gerar_planilha_completa([{"Automation Level": valor}]))

    assert planilha.casos[0].automation_level == esperado


@pytest.mark.parametrize(
    "valor", [4, 0, 1.5, -1, "abc", "1,5", "1.0.0", "um", 10, "2.5", "２", "٢"]
)
def test_automation_level_invalido_informa_linha_coluna_valor_e_esperados(valor):
    conteudo = gerar_planilha_completa(
        [
            {"TC ID": "Clock_001", "Automation Level": 1},
            {"TC ID": "Clock_002", "Automation Level": valor},
        ]
    )

    erro = validar_com_erro(conteudo).erros[0]

    assert (erro.linha, erro.codigo, erro.coluna) == (3, "valor_invalido", "Automation Level")
    assert erro.valor == str(valor)
    assert erro.parametros == {"esperados": ["1", "2", "3"]}


def test_cabecalho_de_automation_level_em_outra_grafia_e_citado_como_esta_na_planilha():
    cabecalho = [
        "automation_level" if coluna == "Automation Level" else coluna
        for coluna in CABECALHO_COMPLETO
    ]

    erro = validar_com_erro(gerar_planilha_completa([{"automation_level": 9}], cabecalho)).erros[0]

    assert erro.coluna == "automation_level"


def test_automation_level_invalido_vem_junto_com_os_outros_erros_da_planilha():
    conteudo = gerar_planilha_completa(
        [
            {"TC ID": "Clock_001", "Automation Level": 7},
            {"TC ID": "Clock_002", "Category": "Z"},
        ]
    )

    invalida = validar_com_erro(conteudo)

    assert [(erro.linha, erro.coluna, erro.codigo) for erro in invalida.erros] == [
        (2, "Automation Level", "valor_invalido"),
        (3, "Category", "valor_invalido"),
    ]
    assert invalida.total_linhas == 2


def test_colunas_de_titulo_e_passos_preenchidas_nao_geram_erro():
    planilha = validar_planilha_projeto(
        gerar_planilha_completa(
            [{"Title(English)": "Abrir alarme", "Test Procedure(English)": "1. Abrir\n2. Fechar"}]
        )
    )

    assert planilha.total_linhas == 1
    assert planilha.casos[0].tc_id == "Clock_001"


TEXTOS = [
    "Title(English)",
    "Test Precondition(English)",
    "Test Procedure(English)",
    "Expected Result(English)",
]


def _textos(caso):
    return (caso.title, caso.precondition, caso.procedure, caso.expected_result)


def test_textos_chegam_em_cada_linha_com_as_quebras_de_linha_em_qualquer_ordem():
    cabecalho = [coluna.upper() if coluna in TEXTOS else coluna for coluna in CABECALHO_COMPLETO]
    cabecalho.reverse()
    linha = {
        coluna.upper(): valor
        for coluna, valor in {
            "Title(English)": "  Check Writing style  ",
            "Test Precondition(English)": "1. Settings > General management",
            "Test Procedure(English)": "1. Messages > Compose\n2-1. Select Shorten",
            "Expected Result(English)": "2-3. Should work normally",
        }.items()
    }

    caso = validar_planilha_projeto(gerar_planilha_completa([linha], cabecalho)).casos[0]

    assert _textos(caso) == (
        "Check Writing style",
        "1. Settings > General management",
        "1. Messages > Compose\n2-1. Select Shorten",
        "2-3. Should work normally",
    )


def test_planilha_sem_as_colunas_de_texto_ou_com_celulas_vazias_importa_sem_textos():
    sem_colunas = [coluna for coluna in CABECALHO_COMPLETO if coluna not in TEXTOS]
    vazias = dict.fromkeys(TEXTOS, "   ")

    sem = validar_planilha_projeto(gerar_planilha_completa([{}], sem_colunas)).casos[0]
    com_vazias = validar_planilha_projeto(gerar_planilha_completa([vazias])).casos[0]

    assert _textos(sem) == (None, None, None, None)
    assert _textos(com_vazias) == (None, None, None, None)


def test_textos_no_limite_sao_aceitos():
    caso = validar_planilha_projeto(
        gerar_planilha_completa(
            [{"Title(English)": "😀" * 500, "Test Procedure(English)": "a" * 10_000}]
        )
    ).casos[0]

    assert len(caso.title) == 500
    assert len(caso.procedure) == 10_000


def test_title_acima_do_limite_informa_linha_coluna_trecho_e_maximo():
    linhas = [
        {"TC ID": "Clock_001"},
        {"TC ID": "Clock_002"},
        {"TC ID": "Clock_003", "Title(English)": "b" * 501},
    ]

    erro = validar_com_erro(gerar_planilha_completa(linhas)).erros[0]

    assert (erro.linha, erro.coluna, erro.codigo) == (4, "Title(English)", "texto_muito_longo")
    assert erro.valor == "b" * 40 + "…"
    assert erro.parametros == {"maximo": 500}


def test_texto_longo_vem_junto_com_os_outros_erros_e_nada_e_importado():
    conteudo = gerar_planilha_completa(
        [
            {"TC ID": "Clock_001", "Expected Result(English)": "c" * 10_001},
            {"TC ID": "Clock_002", "Category": "Z"},
        ]
    )

    invalida = validar_com_erro(conteudo)

    assert [(erro.linha, erro.coluna, erro.codigo) for erro in invalida.erros] == [
        (2, "Expected Result(English)", "texto_muito_longo"),
        (3, "Category", "valor_invalido"),
    ]
    assert invalida.erros[0].parametros == {"maximo": 10_000}


def test_cabecalho_de_texto_com_espaco_antes_dos_parenteses_e_reconhecido():
    cabecalho = [
        "Title (English)" if coluna == "Title(English)" else coluna for coluna in CABECALHO_COMPLETO
    ]

    caso = validar_planilha_projeto(
        gerar_planilha_completa([{"Title (English)": "Check Writing style"}], cabecalho)
    ).casos[0]

    assert caso.title == "Check Writing style"


# Spec 075: Planned date do projeto na planilha.
HOJE = date(2026, 11, 11)


def gerar_planilha_com_data(*datas):
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.append([*CABECALHO, "Planned date"])
    for indice, data in enumerate(datas, start=1):
        worksheet.append([*linha_caso(f"Clock_{indice:03}"), data])
    conteudo = BytesIO()
    workbook.save(conteudo)
    return conteudo.getvalue()


def test_planned_date_em_celula_de_data_ou_texto_vira_a_data_do_projeto():
    planilha = validar_planilha_projeto(
        gerar_planilha_com_data(datetime(2026, 12, 19), "19/12/2026", None), HOJE
    )

    assert planilha.data_planejada == date(2026, 12, 19)


def test_sem_a_coluna_planned_date_o_projeto_fica_sem_data():
    planilha = validar_planilha_projeto(gerar_planilha([linha_caso()]), HOJE)

    assert planilha.data_planejada is None


def test_falha_planned_date_diferente_entre_linhas_aponta_a_linha():
    erro = validar_com_erro_hoje(gerar_planilha_com_data("19/12/2026", "20/12/2026"))

    assert [(e.linha, e.codigo, e.parametros) for e in erro.erros] == [
        (3, "data_planejada_divergente", {"primeira_linha": 2})
    ]


@pytest.mark.parametrize(
    ("valor", "codigo"),
    [
        ("amanhã", "data_planejada_invalida"),
        ("31/02/2026", "data_planejada_invalida"),
        ("10/11/2026", "data_planejada_fora_do_intervalo"),
        ("12/11/2028", "data_planejada_fora_do_intervalo"),
    ],
)
def test_falha_planned_date_invalida_no_passado_ou_a_mais_de_dois_anos(valor, codigo):
    erro = validar_com_erro_hoje(gerar_planilha_com_data(valor))

    assert [(e.linha, e.campo, e.codigo, e.parametros) for e in erro.erros] == [
        (2, "planned date", codigo, None)
    ]


def validar_com_erro_hoje(conteudo):
    with pytest.raises(PlanilhaProjetoInvalida) as erro:
        validar_planilha_projeto(conteudo, HOJE)
    return erro.value
