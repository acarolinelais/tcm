import re
from datetime import UTC, datetime, timedelta
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
    try:
        fuso = ZoneInfo(fuso_horario)
    except (ValueError, ZoneInfoNotFoundError) as erro:
        raise InvalidInputException("Fuso horário inválido.") from erro
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
