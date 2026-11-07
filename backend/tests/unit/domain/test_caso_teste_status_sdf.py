import pytest
from src.domain.entities.caso_teste import StatusCasoTeste
from tests.unit.domain.test_caso_teste import criar_caso

S = StatusCasoTeste
FORA_DA_VALIDACAO = [S.TO_DO, S.IN_PROGRESS, S.IN_REVIEW, S.IN_FIXES]


# Spec 066, RN-04 a RN-06: (Status atual, tudo PASS, FAIL no relatório) → Status novo.
@pytest.mark.parametrize(
    ("atual", "tudo_pass", "fail", "esperado"),
    [
        (S.IN_VALIDATION, True, False, S.DONE),  # CA-01
        (S.IN_VALIDATION, False, True, S.IN_FIXES),  # CA-02
        (S.IN_VALIDATION, False, False, S.IN_VALIDATION),  # CA-03, CA-06 e CA-12
        # Fora de In Validation nada muda, nem com tudo PASS: CA-04, CA-05 e CA-14.
        *[(atual, tudo_pass, fail, atual) for atual in FORA_DA_VALIDACAO
          for tudo_pass, fail in ((True, False), (False, True), (False, False))],
    ],
)
def test_aplicar_resultado_sdf_segue_a_tabela_de_transicoes(atual, tudo_pass, fail, esperado):
    caso = criar_caso(atual)

    caso.aplicar_resultado_sdf(tudo_pass, fail)

    assert caso.status is esperado


@pytest.mark.parametrize(("tudo_pass", "fail"), [(True, False), (False, True)])
def test_excluded_nao_muda_e_mantem_a_justificativa(tudo_pass, fail):
    # CA-09 (falha).
    caso = criar_caso(S.CANCELLED, justificativa_exclusao="Depende de hardware")

    caso.aplicar_resultado_sdf(tudo_pass, fail)

    assert caso.status is S.CANCELLED
    assert caso.justificativa_exclusao == "Depende de hardware"


@pytest.mark.parametrize(("tudo_pass", "fail"), [(True, False), (False, True)])
def test_done_nao_muda(tudo_pass, fail):
    # CA-10 (falha).
    caso = criar_caso(S.DONE)

    caso.aplicar_resultado_sdf(tudo_pass, fail)

    assert caso.status is S.DONE


def test_ir_direto_para_done_nao_preenche_o_code_done():
    # RN-11: o Code done é só a primeira entrada em In Review (spec 065).
    caso = criar_caso(S.IN_VALIDATION)

    caso.aplicar_resultado_sdf(True, False)

    assert caso.code_done_em is None
