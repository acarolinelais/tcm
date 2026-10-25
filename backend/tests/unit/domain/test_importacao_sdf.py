from uuid import uuid4

from src.domain.entities.importacao_sdf import ImportacaoSdf


def test_criar_importacao_registra_projeto_e_usuario():
    unidade_id, projeto_id, usuario_id = uuid4(), uuid4(), uuid4()

    importacao = ImportacaoSdf(unidade_id, projeto_id, usuario_id)

    assert importacao.unidade_id == unidade_id
    assert importacao.projeto_id == projeto_id
    assert importacao.importado_por == usuario_id
