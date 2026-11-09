from datetime import UTC, date, datetime
from uuid import uuid4

import pytest
from src.domain.common.exceptions import InvalidInputException
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


HOJE = date(2026, 11, 9)


def test_definir_data_planejada_inicia_o_planejamento_hoje():
    # CA-01 e CA-06: mudar a data recomeça o planejamento no dia da mudança.
    projeto = Projeto(uuid4(), uuid4(), "Clock", "9.5")

    projeto.definir_data_planejada(date(2026, 12, 19), HOJE)
    projeto.definir_data_planejada(date(2026, 12, 23), date(2026, 11, 12))

    assert projeto.data_planejada == date(2026, 12, 23)
    assert projeto.planejamento_iniciado_em == date(2026, 11, 12)


def test_mesma_data_no_passado_continua_valendo():
    # RN-09: salvar o projeto com a data que ele já tem não recusa nem recomeça o planejamento.
    projeto = Projeto(uuid4(), uuid4(), "Clock", "9.5")
    projeto.definir_data_planejada(date(2026, 11, 20), HOJE)

    projeto.definir_data_planejada(date(2026, 11, 20), date(2026, 12, 1))

    assert projeto.planejamento_iniciado_em == HOJE


def test_apagar_data_planejada_limpa_o_inicio():
    # CA-07.
    projeto = Projeto(uuid4(), uuid4(), "Clock", "9.5")
    projeto.definir_data_planejada(date(2026, 12, 19), HOJE)

    projeto.definir_data_planejada(None, HOJE)

    assert (projeto.data_planejada, projeto.planejamento_iniciado_em) == (None, None)


def test_data_planejada_no_passado_e_recusada():
    # CA-10 (falha): hoje vale; ontem não.
    projeto = Projeto(uuid4(), uuid4(), "Clock", "9.5")
    projeto.definir_data_planejada(HOJE, HOJE)

    with pytest.raises(InvalidInputException, match="passado"):
        projeto.definir_data_planejada(date(2026, 11, 8), HOJE)

    assert projeto.data_planejada == HOJE
