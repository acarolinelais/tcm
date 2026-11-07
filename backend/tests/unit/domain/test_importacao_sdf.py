from uuid import uuid4

import pytest
from src.domain.entities.importacao_sdf import ImportacaoSdf


def test_criar_importacao_registra_projeto_e_usuario():
    unidade_id, projeto_id, usuario_id = uuid4(), uuid4(), uuid4()

    importacao = ImportacaoSdf(unidade_id, projeto_id, usuario_id)

    assert importacao.unidade_id == unidade_id
    assert importacao.projeto_id == projeto_id
    assert importacao.importado_por == usuario_id


def test_desfazer_inativa_e_registra_quem_desfez():
    importacao = ImportacaoSdf(uuid4(), uuid4(), uuid4())
    usuario_id = uuid4()

    importacao.desfazer(usuario_id)

    assert importacao.ativo is False
    assert importacao.desfeita_por == usuario_id
    assert importacao.desfeita_em is not None


def test_falha_desfazer_duas_vezes():
    importacao = ImportacaoSdf(uuid4(), uuid4(), uuid4())
    importacao.desfazer(uuid4())

    with pytest.raises(ValueError, match="já foi desfeita"):
        importacao.desfazer(uuid4())
