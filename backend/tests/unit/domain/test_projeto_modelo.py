from uuid import uuid4

from src.domain.entities.projeto_modelo import ProjetoModelo


def test_criar_vinculo_guarda_tenant_projeto_e_modelo():
    unidade_id, projeto_id, modelo_id = uuid4(), uuid4(), uuid4()

    vinculo = ProjetoModelo(unidade_id, projeto_id, modelo_id)

    assert vinculo.unidade_id == unidade_id
    assert vinculo.projeto_id == projeto_id
    assert vinculo.modelo_dispositivo_id == modelo_id
    assert vinculo.ativo is True
