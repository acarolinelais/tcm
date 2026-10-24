from uuid import uuid4

import pytest
from src.domain.entities.caso_teste import (
    CasoTeste,
    CategoriaCasoTeste,
    DificuldadeCasoTeste,
    SituacaoCasoTeste,
    StatusCasoTeste,
)


def criar_caso() -> CasoTeste:
    return CasoTeste(
        unidade_id=uuid4(),
        projeto_id=uuid4(),
        tc_id=" Clock_001 ",
        category=CategoriaCasoTeste.A,
        difficulty=DificuldadeCasoTeste.LOW,
        responsavel_id=uuid4(),
        backup_id=uuid4(),
        situation=SituacaoCasoTeste.NEW,
    )


def test_criar_caso_normaliza_tc_id_e_inicia_status_to_do():
    caso = criar_caso()

    assert caso.tc_id == "Clock_001"
    assert caso.situation == SituacaoCasoTeste.NEW
    assert caso.status == StatusCasoTeste.TO_DO
    assert caso.backup_id is not None


def test_responsavel_atualiza_somente_seus_campos_permitidos():
    caso = criar_caso()
    responsavel_id, backup_id = caso.responsavel_id, caso.backup_id

    caso.atualizar_campos_do_responsavel(
        StatusCasoTeste.IN_PROGRESS,
        CategoriaCasoTeste.B,
        DificuldadeCasoTeste.MEDIUM,
    )

    assert caso.status == StatusCasoTeste.IN_PROGRESS
    assert caso.situation == SituacaoCasoTeste.NEW
    assert caso.category == CategoriaCasoTeste.B
    assert caso.difficulty == DificuldadeCasoTeste.MEDIUM
    assert caso.responsavel_id == responsavel_id
    assert caso.backup_id == backup_id


def test_gestao_atualiza_situation_e_status():
    caso = criar_caso()

    caso.atualizar_gerenciamento(
        caso.responsavel_id,
        caso.backup_id,
        SituacaoCasoTeste.NEW_STEP,
        StatusCasoTeste.IN_REVIEW,
        CategoriaCasoTeste.C,
        DificuldadeCasoTeste.HIGH,
    )

    assert caso.situation == SituacaoCasoTeste.NEW_STEP
    assert caso.status == StatusCasoTeste.IN_REVIEW


@pytest.mark.parametrize("situation", ["To-Do", "Changed", ""])
def test_criar_caso_com_situation_invalida_levanta_erro(situation):
    with pytest.raises(ValueError):
        CasoTeste(
            unidade_id=uuid4(),
            projeto_id=uuid4(),
            tc_id="Clock_001",
            category=CategoriaCasoTeste.A,
            difficulty=DificuldadeCasoTeste.LOW,
            responsavel_id=uuid4(),
            backup_id=uuid4(),
            situation=situation,
        )


def test_criar_caso_com_status_invalido_levanta_erro():
    with pytest.raises(ValueError):
        CasoTeste(
            unidade_id=uuid4(),
            projeto_id=uuid4(),
            tc_id="Clock_001",
            category=CategoriaCasoTeste.A,
            difficulty=DificuldadeCasoTeste.LOW,
            responsavel_id=uuid4(),
            backup_id=uuid4(),
            situation=SituacaoCasoTeste.NEW,
            status="New",
        )


def test_transferir_para_backup_torna_backup_nulo():
    caso = criar_caso()
    backup_id = caso.backup_id

    caso.transferir_para_backup()

    assert caso.responsavel_id == backup_id
    assert caso.backup_id is None


@pytest.mark.parametrize(
    "responsavel_id,backup_id",
    [(None, uuid4()), (uuid4(), None)],
)
def test_criar_caso_sem_responsavel_principal_ou_backup_levanta_erro(responsavel_id, backup_id):
    with pytest.raises(ValueError):
        CasoTeste(
            unidade_id=uuid4(),
            projeto_id=uuid4(),
            tc_id="Clock_001",
            category=CategoriaCasoTeste.A,
            difficulty=DificuldadeCasoTeste.LOW,
            responsavel_id=responsavel_id,
            backup_id=backup_id,
            situation=SituacaoCasoTeste.NEW,
        )


def test_criar_caso_com_mesma_pessoa_responsavel_e_backup_levanta_erro():
    usuario_id = uuid4()

    with pytest.raises(ValueError, match="distintas"):
        CasoTeste(
            unidade_id=uuid4(),
            projeto_id=uuid4(),
            tc_id="Clock_001",
            category=CategoriaCasoTeste.A,
            difficulty=DificuldadeCasoTeste.LOW,
            responsavel_id=usuario_id,
            backup_id=usuario_id,
            situation=SituacaoCasoTeste.NEW,
        )


def test_transferir_sem_backup_levanta_erro():
    caso = criar_caso()
    caso.backup_id = None

    with pytest.raises(ValueError, match="não possui backup"):
        caso.transferir_para_backup()


def test_reidratar_caso_sem_backup_nao_exige_backup():
    caso = CasoTeste(
        unidade_id=uuid4(),
        projeto_id=uuid4(),
        tc_id="Clock_001",
        category=CategoriaCasoTeste.A,
        difficulty=DificuldadeCasoTeste.LOW,
        responsavel_id=uuid4(),
        backup_id=None,
        situation=SituacaoCasoTeste.NEW,
        exigir_backup=False,
    )

    assert caso.backup_id is None
