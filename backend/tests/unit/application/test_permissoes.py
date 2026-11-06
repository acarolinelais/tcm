import pytest
from src.application.catalogos.permissoes import metadados_permissao


@pytest.mark.parametrize(
    "codigo,modulo_codigo,ordem",
    [
        ("projetos.consultar", "projetos", 1),
        ("projetos.gerenciar", "projetos", 2),
        ("test_cases.consultar", "test_cases", 1),
        ("test_cases.gerenciar", "test_cases", 2),
        ("form_factor.consultar", "form_factor", 1),
        ("form_factor.importar", "form_factor", 2),
    ],
)
def test_metadados_permissoes_dos_projetos(codigo, modulo_codigo, ordem):
    modulo, ordem_encontrada = metadados_permissao(codigo)

    assert modulo.codigo == modulo_codigo
    assert ordem_encontrada == ordem


def test_metadados_permissao_desconhecida_levanta_erro():
    with pytest.raises(ValueError, match="não pertence"):
        metadados_permissao("desconhecido.consultar")
