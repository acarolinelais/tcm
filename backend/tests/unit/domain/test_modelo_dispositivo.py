from uuid import uuid4

import pytest
from src.domain.entities.modelo_dispositivo import ModeloDispositivo


def test_criar_modelo_normaliza_nome_e_inicia_ativo():
    modelo = ModeloDispositivo(uuid4(), " S27 Ultra ")

    assert modelo.nome == "S27 Ultra"
    assert modelo.ativo is True


@pytest.mark.parametrize("nome", ["", "   ", "x" * (ModeloDispositivo.NOME_MAX_LENGTH + 1)])
def test_criar_modelo_com_nome_invalido_levanta_erro(nome: str):
    with pytest.raises(ValueError):
        ModeloDispositivo(uuid4(), nome)


def test_criar_modelo_com_descricao_normaliza_texto():
    modelo = ModeloDispositivo(uuid4(), "S27 Ultra", " Flagship 2027 ")

    assert modelo.descricao == "Flagship 2027"


@pytest.mark.parametrize("descricao", [None, "", "   "])
def test_criar_modelo_sem_descricao_fica_nula(descricao: str | None):
    modelo = ModeloDispositivo(uuid4(), "S27 Ultra", descricao)

    assert modelo.descricao is None


def test_descricao_acima_do_limite_levanta_erro():
    modelo = ModeloDispositivo(uuid4(), "S27 Ultra", "Flagship")

    with pytest.raises(ValueError):
        modelo.atualizar_descricao("x" * (ModeloDispositivo.DESCRICAO_MAX_LENGTH + 1))

    assert modelo.descricao == "Flagship"
