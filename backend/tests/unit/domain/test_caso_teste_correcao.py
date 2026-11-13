from datetime import datetime
from uuid import uuid4

import pytest
from src.domain.common.exceptions import ConflictException, InvalidInputException
from src.domain.entities.caso_teste import StatusCasoTeste
from tests.unit.domain.test_caso_teste import criar_caso

S = StatusCasoTeste


def caso_em_correcao():
    caso = criar_caso(S.IN_VALIDATION)
    caso.aplicar_resultado_sdf(sem_falha=False, falha_no_relatorio=True)
    return caso


# Spec 073: tentativa de correção e End Date da correção.
def test_falha_no_sdf_em_validacao_abre_a_tentativa_1():
    caso = caso_em_correcao()

    assert caso.status is S.IN_FIXES
    assert caso.tentativa_correcao == 1
    assert caso.em_correcao()


def test_falha_manual_da_rodada_tambem_abre_a_tentativa():
    caso = criar_caso(S.IN_VALIDATION)
    modelo = uuid4()

    caso.registrar_resultado_form_factor({modelo: "FAIL"}, {modelo})

    assert (caso.status, caso.tentativa_correcao) == (S.IN_FIXES, 1)


def test_cada_volta_de_validacao_para_in_fixes_e_uma_nova_tentativa():
    caso = caso_em_correcao()
    for status in (S.IN_PROGRESS, S.IN_REVIEW, S.IN_VALIDATION):
        caso.mudar_status_da_correcao(status)

    caso.aplicar_resultado_sdf(sem_falha=False, falha_no_relatorio=True)

    assert (caso.status, caso.tentativa_correcao) == (S.IN_FIXES, 2)


def test_in_review_na_correcao_grava_a_end_date_e_a_nova_tentativa_a_apaga():
    caso = caso_em_correcao()
    # Na automação o caso já passou por In Review: a End date da aba Test Cases está gravada.
    code_done = caso.code_done_em = datetime(2026, 11, 1, 10)

    caso.mudar_status_da_correcao(S.IN_REVIEW)
    primeira = caso.correcao_em_revisao_em
    caso.mudar_status_da_correcao(S.IN_PROGRESS)
    caso.mudar_status_da_correcao(S.IN_REVIEW)

    assert primeira is not None
    # A End date da tentativa é a primeira entrada em In Review dela; a da automação não muda.
    assert caso.correcao_em_revisao_em == primeira
    assert caso.code_done_em == code_done
    caso.mudar_status_da_correcao(S.IN_VALIDATION)
    caso.aplicar_resultado_sdf(sem_falha=False, falha_no_relatorio=True)
    assert caso.correcao_em_revisao_em is None


def test_in_review_fora_da_correcao_nao_grava_a_end_date_da_correcao():
    caso = criar_caso(S.IN_PROGRESS)

    caso.atualizar_campos_do_responsavel(S.IN_REVIEW, caso.category, caso.difficulty)

    assert caso.correcao_em_revisao_em is None


def test_passar_em_todos_os_devices_tira_o_caso_da_correcao():
    caso = caso_em_correcao()
    caso.mudar_status_da_correcao(S.IN_VALIDATION)

    caso.aplicar_resultado_sdf(sem_falha=True, falha_no_relatorio=False)

    assert caso.status is S.DONE
    assert not caso.em_correcao()


def test_desfazer_a_importacao_que_abriu_a_tentativa_a_desconta():
    caso = caso_em_correcao()

    assert caso.desfazer_resultado_sdf(S.IN_FIXES)
    assert (caso.status, caso.tentativa_correcao) == (S.IN_VALIDATION, 0)


@pytest.mark.parametrize("status", [S.TO_DO, S.DONE, S.CANCELLED])
def test_falha_status_fora_da_correcao_e_recusado(status):
    caso = caso_em_correcao()

    with pytest.raises(InvalidInputException):
        caso.mudar_status_da_correcao(status)
    assert caso.status is S.IN_FIXES


def test_falha_caso_que_nunca_falhou_no_sdf_nao_esta_em_correcao():
    caso = criar_caso(S.IN_PROGRESS)

    with pytest.raises(ConflictException):
        caso.mudar_status_da_correcao(S.IN_REVIEW)
    assert caso.status is S.IN_PROGRESS


# Spec 076: regressão em caso Done.
def test_regressao_em_done_reabre_em_in_fixes_na_tentativa_seguinte():
    # CA-01 e CA-02.
    caso = criar_caso(S.DONE)
    caso.tentativa_correcao = 1
    caso.correcao_em_revisao_em = datetime(2026, 11, 5)

    assert caso.reabrir_por_regressao() is True
    assert caso.status is S.IN_FIXES
    assert caso.tentativa_correcao == 2
    assert caso.correcao_em_revisao_em is None
    assert caso.em_correcao()


@pytest.mark.parametrize("status", [s for s in S if s is not S.DONE])
def test_falha_regressao_so_reabre_caso_done(status):
    # CA-05 (Cancelled) e os outros Status: quem não está em Done segue a regra da spec 066.
    textos = {"justificativa_exclusao": "Depende de hardware"} if status is S.CANCELLED else {}
    caso = criar_caso(status, **textos)

    assert caso.reabrir_por_regressao() is False
    assert caso.status is status
    assert caso.tentativa_correcao == 0


def test_mover_done_para_in_fixes_na_mao_nao_abre_tentativa():
    caso = criar_caso(S.DONE)

    caso.atualizar_campos_do_responsavel(S.IN_FIXES, caso.category, caso.difficulty)

    assert caso.tentativa_correcao == 0
