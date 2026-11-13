from datetime import datetime
from uuid import uuid4

import pytest
from src.domain.common.exceptions import ConflictException
from src.domain.entities.correcao import Correcao, OrigemCorrecao, ResultadoCorrecao


def nova(tentativa=1, falha_em=datetime(2026, 11, 10, 18, 10)):
    return Correcao(uuid4(), uuid4(), tentativa, OrigemCorrecao.VALIDACAO, falha_em)


def test_tentativa_nova_comeca_aberta_e_sem_corretor():
    correcao = nova()

    assert correcao.aberta
    assert correcao.corretor_id is None


def test_fechar_como_corrigida_grava_corretor_datas_e_dias():
    # CA-07: falha em 10/11, passou em todos os devices em 14/11 (os dias saem na consulta, T08).
    correcao = nova()
    ana = uuid4()

    correcao.fechar(
        ResultadoCorrecao.CORRIGIDA,
        datetime(2026, 11, 14, 9, 0),
        ana,
        datetime(2026, 11, 12, 15, 0),
    )

    assert not correcao.aberta
    assert correcao.corretor_id == ana
    assert correcao.em_revisao_em == datetime(2026, 11, 12, 15, 0)
    assert correcao.fechada_em == datetime(2026, 11, 14, 9, 0)


def test_falha_fechar_duas_vezes_e_recusado():
    # CA-09: uma tentativa fechada não troca de corretor.
    correcao = nova()
    ana = uuid4()
    correcao.fechar(ResultadoCorrecao.FALHOU_DE_NOVO, datetime(2026, 11, 12), ana, None)

    with pytest.raises(ConflictException):
        correcao.fechar(ResultadoCorrecao.CORRIGIDA, datetime(2026, 11, 13), uuid4(), None)
    assert correcao.corretor_id == ana


def test_reabrir_desfaz_o_fechamento():
    correcao = nova()
    importacao = uuid4()
    correcao.fechar(ResultadoCorrecao.CORRIGIDA, datetime(2026, 11, 14), uuid4(), None, importacao)

    correcao.reabrir()

    assert correcao.aberta
    assert correcao.fechada_em is None
    assert correcao.corretor_id is None
    assert correcao.fechada_por_importacao_id is None


def test_falha_tentativa_zero_e_recusada():
    with pytest.raises(ValueError):
        nova(tentativa=0)


def test_falha_fechar_com_data_anterior_a_falha_fecha_no_dia_da_falha():
    # Aberta à mão em 13/11 e fechada por um relatório de 10/11: os dias não ficam negativos.
    correcao = nova(falha_em=datetime(2026, 11, 13, 10))

    correcao.fechar(ResultadoCorrecao.CORRIGIDA, datetime(2026, 11, 10, 18), uuid4(), None)

    assert correcao.fechada_em == datetime(2026, 11, 13, 10)
