from datetime import UTC, datetime

from src.domain.entities.caso_teste import CategoriaCasoTeste, DificuldadeCasoTeste, StatusCasoTeste
from tests.unit.domain.test_caso_teste import criar_caso


def _agora():
    return datetime.now(UTC).replace(tzinfo=None)


def _mudar_status(caso, status):
    # O mesmo método que a tela do caso e o Board usam (CA-03).
    caso.atualizar_campos_do_responsavel(status, CategoriaCasoTeste.A, DificuldadeCasoTeste.LOW)


def test_code_done_em_e_gravado_na_primeira_entrada_em_in_review():
    caso = criar_caso(StatusCasoTeste.IN_PROGRESS)
    antes = _agora()

    _mudar_status(caso, StatusCasoTeste.IN_REVIEW)

    assert caso.code_done_em is not None
    assert antes <= caso.code_done_em <= _agora()
    assert caso.code_done_em.tzinfo is None


def test_code_done_em_nao_muda_quando_o_caso_volta_para_in_review():
    caso = criar_caso(StatusCasoTeste.IN_PROGRESS)
    _mudar_status(caso, StatusCasoTeste.IN_REVIEW)
    primeira = caso.code_done_em = datetime(2026, 11, 1, 10, 0)

    _mudar_status(caso, StatusCasoTeste.IN_PROGRESS)
    _mudar_status(caso, StatusCasoTeste.IN_REVIEW)

    assert caso.code_done_em == primeira


def test_code_done_em_fica_vazio_em_outros_status():
    caso = criar_caso(StatusCasoTeste.TO_DO)

    _mudar_status(caso, StatusCasoTeste.IN_PROGRESS)
    _mudar_status(caso, StatusCasoTeste.IN_VALIDATION)

    assert caso.code_done_em is None


def test_code_done_em_nao_e_gravado_ao_salvar_um_caso_que_ja_esta_em_in_review():
    # Caso que já estava em In Review sem histórico (CA-11): salvar outro campo não inventa a data.
    caso = criar_caso(StatusCasoTeste.IN_REVIEW)

    _mudar_status(caso, StatusCasoTeste.IN_REVIEW)

    assert caso.code_done_em is None
