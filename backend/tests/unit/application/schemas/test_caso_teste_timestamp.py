from datetime import UTC, datetime
from uuid import uuid4

from src.application.schemas.caso_teste import to_response
from src.domain.entities.caso_teste import CasoTeste


def test_timestamp_sem_fuso_do_banco_e_serializado_com_utc_explicito():
    caso = CasoTeste(uuid4(), uuid4(), "Clock_001", "A", "Low", uuid4(), uuid4(), "New")
    caso.created_at = datetime(2026, 3, 23, 3)
    caso.updated_at = datetime(2026, 3, 23, 4, tzinfo=UTC)
    resposta = to_response(caso)
    assert resposta.model_dump(mode="json")["created_at"] == "2026-03-23T03:00:00Z"
    assert resposta.model_dump(mode="json")["updated_at"] == "2026-03-23T04:00:00Z"
