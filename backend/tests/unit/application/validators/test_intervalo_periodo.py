from datetime import UTC, date, datetime
from zoneinfo import ZoneInfo

import pytest
from src.application.validators.semana import intervalo_periodo
from src.domain.common.exceptions import InvalidInputException


def test_semana_no_fuso_de_sao_paulo_vai_do_inicio_ao_fim_dos_dias_locais():
    assert intervalo_periodo(
        date(2026, 12, 28), date(2027, 1, 3), ZoneInfo("America/Sao_Paulo")
    ) == (
        datetime(2026, 12, 28, 3, tzinfo=UTC),
        datetime(2027, 1, 4, 3, tzinfo=UTC),
    )


def test_mes_de_31_dias_e_aceito():
    inicio, fim = intervalo_periodo(date(2026, 12, 1), date(2026, 12, 31), ZoneInfo("UTC"))
    assert (inicio, fim) == (datetime(2026, 12, 1, tzinfo=UTC), datetime(2027, 1, 1, tzinfo=UTC))


@pytest.mark.parametrize(
    "inicio,fim",
    [(date(2026, 12, 10), date(2026, 12, 9)), (date(2026, 12, 1), date(2027, 1, 1))],
)
def test_falha_periodo_invertido_ou_maior_que_31_dias(inicio, fim):
    with pytest.raises(InvalidInputException):
        intervalo_periodo(inicio, fim, ZoneInfo("UTC"))
