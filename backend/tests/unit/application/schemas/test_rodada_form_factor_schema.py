import pytest
from pydantic import ValidationError
from src.application.schemas.form_factor import CriarRodadaFormFactorLoteRequest


@pytest.mark.parametrize(
    ("enviado", "esperado"),
    [(" SDF-001 ", "SDF-001"), ("SDF-001", "SDF-001"), ("", None), ("   ", None), (None, None)],
)
def test_request_rodada_remove_espacos_e_vazio_vira_none(enviado, esperado):
    assert CriarRodadaFormFactorLoteRequest(sdf_id=enviado).sdf_id == esperado


def test_request_rodada_aceita_cinquenta_caracteres_cercados_de_espacos():
    assert CriarRodadaFormFactorLoteRequest(sdf_id=f"  {'x' * 50}  ").sdf_id == "x" * 50


def test_request_rodada_recusa_sdf_id_acima_de_cinquenta_sem_os_espacos():
    with pytest.raises(ValidationError):
        CriarRodadaFormFactorLoteRequest(sdf_id=f" {'x' * 51} ")
