from datetime import UTC, datetime
from uuid import uuid4

import pytest
from src.domain.entities.projeto import Projeto, StatusProjeto


def test_criar_projeto_deriva_nome_e_inicia_em_created():
    projeto = Projeto(uuid4(), uuid4(), " Clock ", "9.5")

    assert projeto.nome == "Clock 9.5"
    assert projeto.status == StatusProjeto.CREATED


def test_atualizar_status_preserva_data_de_criacao():
    projeto = Projeto(uuid4(), uuid4(), "Clock", "9.5")
    criado_em = datetime(2026, 10, 23, tzinfo=UTC)
    projeto.created_at = criado_em

    projeto.atualizar_status(StatusProjeto.IN_PROGRESS)

    assert projeto.status == StatusProjeto.IN_PROGRESS
    assert projeto.created_at == criado_em


@pytest.mark.parametrize("app,one_ui", [("  ", "9.5"), ("Clock", "")])
def test_criar_projeto_sem_app_ou_versao_levanta_erro(app: str, one_ui: str):
    with pytest.raises(ValueError):
        Projeto(uuid4(), uuid4(), app, one_ui)
