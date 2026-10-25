from uuid import uuid4

import pytest
from src.domain.common.usuario_autenticado import UsuarioAutenticado

TIME, SETOR = uuid4(), uuid4()


def _usuario(perfil, time_ids=(), setores=(), times_gerenciados=()):
    return UsuarioAutenticado(
        uuid4(),
        uuid4(),
        perfil,
        time_ids=time_ids,
        setores_gerenciados=setores,
        times_gerenciados=times_gerenciados,
    )


def test_administrador_tem_qualquer_time_no_escopo():
    assert _usuario("ADMIN_UNIDADE").time_no_escopo(TIME, SETOR)


@pytest.mark.parametrize(
    "usuario",
    [_usuario("GERENTE", setores=(SETOR,)), _usuario("GERENTE", time_ids=(TIME,))],
    ids=["pelo-setor", "por-participacao"],
)
def test_gerente_tem_no_escopo_time_do_setor_ou_em_que_participa(usuario):
    assert usuario.time_no_escopo(TIME, SETOR)


def test_gerente_sem_setor_nem_participacao_nao_tem_o_time_no_escopo():
    gerente = _usuario("GERENTE", time_ids=(uuid4(),), setores=(uuid4(),))

    assert not gerente.time_no_escopo(TIME, SETOR)


@pytest.mark.parametrize("perfil", ["KP", "USUARIO_PADRAO"])
def test_kp_e_developer_so_tem_no_escopo_por_participacao(perfil):
    assert _usuario(perfil, time_ids=(TIME,)).time_no_escopo(TIME, SETOR)
    # Setor gerenciado só vale para o perfil GERENTE.
    assert not _usuario(perfil, setores=(SETOR,)).time_no_escopo(TIME, SETOR)


def test_times_no_escopo_do_gerente_junta_setores_e_participacao_sem_duplicar():
    outro = uuid4()
    gerente = _usuario("GERENTE", time_ids=(TIME, outro), times_gerenciados=(TIME,))

    assert gerente.times_no_escopo == (TIME, outro)


def test_times_no_escopo_do_kp_ignora_times_gerenciados():
    kp = _usuario("KP", time_ids=(TIME,), times_gerenciados=(uuid4(),))

    assert kp.times_no_escopo == (TIME,)
