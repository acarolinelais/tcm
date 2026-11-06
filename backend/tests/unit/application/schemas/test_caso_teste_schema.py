import pytest
from pydantic import ValidationError
from src.application.schemas.caso_teste import AtualizarCasoTesteRequest


def test_request_aceita_exclusao_com_justificativa_sem_os_espacos_das_pontas():
    request = AtualizarCasoTesteRequest(
        status="Cancelled", justificativa_exclusao="  Depende de hardware indisponível "
    )

    assert request.justificativa_exclusao == "Depende de hardware indisponível"


@pytest.mark.parametrize("justificativa", [None, "", "   "])
def test_request_exige_justificativa_ao_excluir(justificativa):
    with pytest.raises(ValidationError, match="justificativa"):
        AtualizarCasoTesteRequest(status="Cancelled", justificativa_exclusao=justificativa)


def test_request_exige_justificativa_ao_excluir_mesmo_sem_o_campo():
    with pytest.raises(ValidationError, match="justificativa"):
        AtualizarCasoTesteRequest(status="Cancelled")


def test_request_aceita_justificativa_de_500_caracteres_e_recusa_acima():
    assert AtualizarCasoTesteRequest(status="Cancelled", justificativa_exclusao="x" * 500)
    with pytest.raises(ValidationError):
        AtualizarCasoTesteRequest(status="Cancelled", justificativa_exclusao="x" * 501)


@pytest.mark.parametrize("status", [None, "To-Do"])
def test_request_recusa_justificativa_sem_exclusao(status):
    campos = {"status": status} if status else {}
    with pytest.raises(ValidationError, match="justificativa"):
        AtualizarCasoTesteRequest(**campos, justificativa_exclusao="Fora do escopo")
