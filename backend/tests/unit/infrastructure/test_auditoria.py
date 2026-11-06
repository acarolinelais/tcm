import pytest
from src.infrastructure.data.auditoria import TELA_MAX_LENGTH, tela_da_requisicao


@pytest.mark.parametrize(
    ("cabecalho", "esperado"),
    [
        ("/projetos/7f3a/kanban", "/projetos/7f3a/kanban"),
        ("/projetos/7f3a?aba=test-cases&status=InProgress", "/projetos/7f3a"),
        ("/configuracoes#cor", "/configuracoes"),
    ],
)
def test_tela_fica_so_com_o_caminho(cabecalho, esperado):
    assert tela_da_requisicao(cabecalho) == esperado


@pytest.mark.parametrize("cabecalho", [None, "", "https://outro.site/projetos", "projetos"])
def test_falha_tela_que_nao_e_caminho_e_ignorada(cabecalho):
    assert tela_da_requisicao(cabecalho) is None


def test_falha_tela_longa_e_cortada_no_limite():
    assert len(tela_da_requisicao("/" + "a" * 1000)) == TELA_MAX_LENGTH
