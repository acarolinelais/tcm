from uuid import uuid4

import pytest
from src.domain.entities.caso_teste import (
    CasoTeste,
    CategoriaCasoTeste,
    DificuldadeCasoTeste,
    NivelAutomacaoCasoTeste,
    SituacaoCasoTeste,
    StatusCasoTeste,
)


def criar_caso(status: StatusCasoTeste = StatusCasoTeste.TO_DO) -> CasoTeste:
    return CasoTeste(
        unidade_id=uuid4(),
        projeto_id=uuid4(),
        tc_id=" Clock_001 ",
        category=CategoriaCasoTeste.A,
        difficulty=DificuldadeCasoTeste.LOW,
        responsavel_id=uuid4(),
        backup_id=uuid4(),
        situation=SituacaoCasoTeste.NEW,
        status=status,
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


def test_responsavel_atualiza_tc_situation_quando_informada():
    caso = criar_caso()

    caso.atualizar_campos_do_responsavel(
        caso.status, caso.category, caso.difficulty, SituacaoCasoTeste.WITHOUT_CHANGES
    )

    assert caso.situation == SituacaoCasoTeste.WITHOUT_CHANGES


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


def test_status_inclui_conclusao_e_cancelamento():
    assert list(StatusCasoTeste) == [
        "To-Do",
        "InProgress",
        "InReview",
        "InValidation",
        "Done",
        "InFixes",
        "Cancelled",
    ]


def test_resultado_fail_move_tc_para_correcao_e_pass_completo_para_done():
    caso = criar_caso(status=StatusCasoTeste.IN_VALIDATION)
    modelos = {uuid4(), uuid4()}

    caso.registrar_resultado_form_factor({next(iter(modelos)): "FAIL"}, modelos)
    assert caso.status is StatusCasoTeste.IN_FIXES

    caso.atualizar_campos_do_responsavel(
        StatusCasoTeste.IN_VALIDATION, caso.category, caso.difficulty
    )
    caso.registrar_resultado_form_factor({modelo_id: "PASS" for modelo_id in modelos}, modelos)
    assert caso.status is StatusCasoTeste.DONE


def test_resultado_parcial_mantem_tc_em_validacao():
    caso = criar_caso(status=StatusCasoTeste.IN_VALIDATION)
    modelos = {uuid4(), uuid4()}

    caso.registrar_resultado_form_factor({next(iter(modelos)): "PASS"}, modelos)

    assert caso.status is StatusCasoTeste.IN_VALIDATION


@pytest.mark.parametrize("status", [StatusCasoTeste.CANCELLED, StatusCasoTeste.DONE])
def test_resultado_de_rodada_nao_traz_tc_fora_da_validacao_de_volta_ao_fluxo(status):
    caso = criar_caso(status=status)
    modelos = {uuid4()}

    caso.registrar_resultado_form_factor({next(iter(modelos)): "FAIL"}, modelos)

    assert caso.status is status


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


@pytest.mark.parametrize("status", ["New", "Validation", "In Validation"])
def test_criar_caso_com_status_invalido_levanta_erro(status):
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
            status=status,
        )


def test_transferir_para_backup_troca_responsavel_e_backup():
    caso = criar_caso()
    responsavel_id, backup_id = caso.responsavel_id, caso.backup_id

    caso.transferir_para_backup()

    assert caso.responsavel_id == backup_id
    assert caso.backup_id == responsavel_id


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


def test_nivel_de_automacao_aceita_somente_1_2_e_3():
    assert [nivel.value for nivel in NivelAutomacaoCasoTeste] == [1, 2, 3]
    assert NivelAutomacaoCasoTeste(2) is NivelAutomacaoCasoTeste.PARCIALMENTE_AUTOMATIZAVEL


@pytest.mark.parametrize("valor", [0, 4, -1])
def test_nivel_de_automacao_fora_de_1_a_3_levanta_erro(valor):
    with pytest.raises(ValueError):
        NivelAutomacaoCasoTeste(valor)


def test_caso_nasce_sem_nivel_de_automacao_e_aceita_um_na_criacao():
    assert criar_caso().automation_level is None

    caso = CasoTeste(
        unidade_id=uuid4(),
        projeto_id=uuid4(),
        tc_id="Clock_001",
        category=CategoriaCasoTeste.A,
        difficulty=DificuldadeCasoTeste.LOW,
        responsavel_id=uuid4(),
        backup_id=uuid4(),
        situation=SituacaoCasoTeste.NEW,
        automation_level=3,
    )

    assert caso.automation_level is NivelAutomacaoCasoTeste.TOTALMENTE_AUTOMATIZAVEL


def test_criar_caso_com_nivel_de_automacao_invalido_levanta_erro():
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
            automation_level=4,
        )


def test_responsavel_define_e_troca_o_nivel_de_automacao():
    caso = criar_caso()

    caso.atualizar_campos_do_responsavel(
        caso.status,
        caso.category,
        caso.difficulty,
        automation_level=NivelAutomacaoCasoTeste.NAO_AUTOMATIZAVEL,
    )
    assert caso.automation_level is NivelAutomacaoCasoTeste.NAO_AUTOMATIZAVEL

    caso.atualizar_campos_do_responsavel(
        caso.status,
        caso.category,
        caso.difficulty,
        automation_level=NivelAutomacaoCasoTeste.TOTALMENTE_AUTOMATIZAVEL,
    )
    assert caso.automation_level is NivelAutomacaoCasoTeste.TOTALMENTE_AUTOMATIZAVEL


def test_atualizar_sem_nivel_de_automacao_mantem_o_que_ja_estava():
    caso = criar_caso()
    caso.atualizar_campos_do_responsavel(
        caso.status,
        caso.category,
        caso.difficulty,
        automation_level=NivelAutomacaoCasoTeste.PARCIALMENTE_AUTOMATIZAVEL,
    )

    caso.atualizar_campos_do_responsavel(
        StatusCasoTeste.IN_PROGRESS, caso.category, caso.difficulty
    )
    caso.atualizar_gerenciamento(
        caso.responsavel_id,
        caso.backup_id,
        caso.situation,
        caso.status,
        caso.category,
        caso.difficulty,
    )

    assert caso.automation_level is NivelAutomacaoCasoTeste.PARCIALMENTE_AUTOMATIZAVEL


def test_gestao_define_o_nivel_de_automacao():
    caso = criar_caso()

    caso.atualizar_gerenciamento(
        caso.responsavel_id,
        caso.backup_id,
        caso.situation,
        caso.status,
        caso.category,
        caso.difficulty,
        NivelAutomacaoCasoTeste.TOTALMENTE_AUTOMATIZAVEL,
    )

    assert caso.automation_level is NivelAutomacaoCasoTeste.TOTALMENTE_AUTOMATIZAVEL


def test_atualizar_com_nivel_de_automacao_invalido_levanta_erro_e_nao_altera():
    caso = criar_caso()

    with pytest.raises(ValueError):
        caso.atualizar_campos_do_responsavel(
            StatusCasoTeste.IN_REVIEW, CategoriaCasoTeste.C, caso.difficulty, automation_level=7
        )

    assert caso.automation_level is None
    assert caso.status is StatusCasoTeste.TO_DO
    assert caso.category is CategoriaCasoTeste.A


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
