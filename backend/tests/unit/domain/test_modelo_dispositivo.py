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
