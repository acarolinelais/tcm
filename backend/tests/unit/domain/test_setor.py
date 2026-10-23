from uuid import uuid4

from src.domain.entities.setor import Setor


def test_criar_setor_guarda_unidade_e_nome():
    unidade_id = uuid4()

    setor = Setor(unidade_id, "Gerência de Testes")

    assert setor.unidade_id == unidade_id
    assert setor.nome == "Gerência de Testes"
    assert setor.ativo is True
