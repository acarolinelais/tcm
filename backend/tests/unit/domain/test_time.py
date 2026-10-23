from uuid import uuid4

from src.domain.entities.time import Time
from src.domain.entities.time_membro import TimeMembro


def test_criar_time_guarda_setor_e_gerente():
    unidade_id, setor_id, gerente_id = uuid4(), uuid4(), uuid4()

    time = Time(unidade_id, setor_id, "Time Alpha", gerente_id)

    assert time.setor_id == setor_id
    assert time.gerente_id == gerente_id


def test_criar_time_membro_ativo():
    membro = TimeMembro(uuid4(), uuid4(), uuid4())

    assert membro.ativo is True
