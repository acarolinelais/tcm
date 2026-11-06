import re
from datetime import UTC, date, datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from src.domain.common.exceptions import InvalidInputException


def intervalo_semana_iso(
    semana: str | None, fuso_horario: str = "UTC"
) -> tuple[datetime | None, datetime | None]:
    if semana is None:
        return None, None
    if not re.fullmatch(r"\d{4}-W\d{2}", semana):
        raise InvalidInputException("Semana deve usar o formato ISO YYYY-Www.")
    ano, numero = semana.split("-W")
    fuso = fuso_horario_valido(fuso_horario)
    try:
        inicio = datetime.fromisocalendar(int(ano), int(numero), 1).replace(tzinfo=fuso)
        fim = inicio + timedelta(days=7)
        # Os timestamps atuais são armazenados sem timezone, em UTC.
        return (
            inicio.astimezone(UTC).replace(tzinfo=None),
            fim.astimezone(UTC).replace(tzinfo=None),
        )
    except (ValueError, OverflowError) as erro:
        raise InvalidInputException("Semana ISO inválida.") from erro


def fuso_horario_valido(fuso_horario: str) -> ZoneInfo:
    try:
        return ZoneInfo(fuso_horario)
    except (ValueError, ZoneInfoNotFoundError) as erro:
        raise InvalidInputException("Fuso horário inválido.") from erro


def intervalo_dia(
    dia: str | None, fuso_horario: str = "UTC"
) -> tuple[datetime | None, datetime | None]:
    """Início e fim (exclusivo) de um dia `AAAA-MM-DD` no fuso pedido, em UTC sem fuso (032)."""
    if dia is None:
        return None, None
    fuso = fuso_horario_valido(fuso_horario)
    try:
        inicio = datetime.combine(date.fromisoformat(dia), datetime.min.time(), fuso)
    except ValueError as erro:
        raise InvalidInputException("Dia deve usar o formato AAAA-MM-DD.") from erro
    fim = inicio + timedelta(days=1)
    return inicio.astimezone(UTC).replace(tzinfo=None), fim.astimezone(UTC).replace(tzinfo=None)


PERIODO_MAXIMO_DIAS = 31


def intervalo_periodo(inicio: date, fim: date, fuso: ZoneInfo) -> tuple[datetime, datetime]:
    """Do início do dia `inicio` ao fim do dia `fim` (inclusivo) no fuso pedido, em UTC (spec 054).

    Fica com fuso porque a auditoria grava `created_at` como TIMESTAMPTZ.
    """
    if fim < inicio:
        raise InvalidInputException("A data final não pode ser anterior à inicial.")
    if (fim - inicio).days + 1 > PERIODO_MAXIMO_DIAS:
        raise InvalidInputException(f"O período pode ter no máximo {PERIODO_MAXIMO_DIAS} dias.")
    comeco = datetime.combine(inicio, datetime.min.time(), fuso)
    termino = datetime.combine(fim + timedelta(days=1), datetime.min.time(), fuso)
    return comeco.astimezone(UTC), termino.astimezone(UTC)
