from datetime import datetime, timedelta

import pytest
from src.application.validators.semana import intervalo_dia, intervalo_semana_iso
from src.domain.common.exceptions import InvalidInputException


def test_semana_respeita_o_fuso_do_navegador():
    assert intervalo_semana_iso("2026-W13", "America/Manaus") == (
        datetime(2026, 3, 23, 4),
        datetime(2026, 3, 30, 4),
    )


def test_semana_preserva_limites_locais_na_troca_de_horario_de_verao():
    inicio, fim = intervalo_semana_iso("2026-W10", "America/New_York")
    assert fim - inicio == timedelta(hours=167)


@pytest.mark.parametrize(
    "semana,fuso",
    [
        ("2026-W54", "UTC"),
        ("2026-W00", "UTC"),
        ("2026-13", "UTC"),
        ("2026-W13", "Inexistente/Teste"),
    ],
)
def test_semana_ou_fuso_invalido_e_recusado(semana, fuso):
    with pytest.raises(InvalidInputException):
        intervalo_semana_iso(semana, fuso)


def test_dia_respeita_o_fuso_do_navegador():
    assert intervalo_dia("2026-10-10", "America/Manaus") == (
        datetime(2026, 10, 10, 4),
        datetime(2026, 10, 11, 4),
    )
    assert intervalo_dia(None) == (None, None)


@pytest.mark.parametrize(
    "dia,fuso", [("2026-13-01", "UTC"), ("10/10/2026", "UTC"), ("2026-10-10", "Inexistente/Teste")]
)
def test_dia_ou_fuso_invalido_e_recusado(dia, fuso):
    with pytest.raises(InvalidInputException):
        intervalo_dia(dia, fuso)
