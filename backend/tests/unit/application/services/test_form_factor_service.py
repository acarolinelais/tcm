from datetime import datetime, timedelta
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from src.application.schemas.form_factor import CriarRodadaFormFactorRequest
from src.application.services.form_factor_service import (
    FormFactorServiceImpl,
    _intervalo_semana_iso,
)
from src.domain.common.exceptions import ForbiddenException, NotFoundException
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.caso_teste import CasoTeste
from src.domain.entities.projeto import Projeto
from src.domain.entities.time import Time
from src.domain.queries.form_factor_linha import (
    FormFactorExecucaoLinha,
    FormFactorLinha,
    FormFactorLinhaGlobal,
    FormFactorModeloGlobal,
    FormFactorResponsavelGlobal,
)
from src.domain.queries.modelo_do_projeto import ModeloDoProjeto


async def test_consulta_form_factor_com_semana_responsavel_e_modelos():
    projeto_repo, time_repo, resultado_repo, modelo_repo = (AsyncMock() for _ in range(4))
    unidade_id, usuario_id, time_id, setor_id = (uuid4() for _ in range(4))
    projeto = Projeto(unidade_id, time_id, "Clock", "9.5")
    time = Time(unidade_id, setor_id, "QA", usuario_id)
    usuario = UsuarioAutenticado(
        usuario_id,
        unidade_id,
        "GERENTE",
        permissoes=frozenset({"form_factor.consultar"}),
        setores_gerenciados=(setor_id,),
    )
    projeto_repo.obter_por_id.return_value = projeto
    time_repo.obter_por_id.return_value = time
    caso_id, modelo_id = uuid4(), uuid4()
    resultado_repo.listar_form_factor_por_projeto.return_value = PagedResult(
        [FormFactorLinha(caso_id, "TC-001", usuario_id, None, None, {modelo_id: "Pass"})], 1, 10, 1
    )
    modelo_repo.listar_modelos_do_projeto.return_value = (
        ModeloDoProjeto(modelo_id, "SAMSUNG S25"),
    )
    service = FormFactorServiceImpl(
        projeto_repo, time_repo, resultado_repo, modelo_repo, AsyncMock(), AsyncMock(), AsyncMock()
    )

    resultado = await service.listar(usuario, projeto.id, 1, 10, "2026-W12", usuario_id)

    inicio = datetime.fromisocalendar(2026, 12, 1)
    resultado_repo.listar_form_factor_por_projeto.assert_awaited_once_with(
        unidade_id,
        projeto.id,
        1,
        10,
        inicio,
        inicio + timedelta(days=7),
        usuario_id,
        None,
        None,
        None,
        None,
    )
    modelo_repo.listar_modelos_do_projeto.assert_awaited_once_with(unidade_id, projeto.id)
    assert [modelo.nome for modelo in resultado.modelos] == ["SAMSUNG S25"]
    assert resultado.items[0].resultados == {modelo_id: "Pass"}
    assert resultado.total_count == 1


async def test_consulta_historico_form_factor_com_filtros():
    projeto_repo, time_repo, resultado_repo, modelo_repo = (AsyncMock() for _ in range(4))
    unidade_id, usuario_id, time_id, setor_id = (uuid4() for _ in range(4))
    projeto = Projeto(unidade_id, time_id, "Clock", "9.5")
    usuario = UsuarioAutenticado(
        usuario_id,
        unidade_id,
        "GERENTE",
        permissoes=frozenset({"form_factor.consultar"}),
        setores_gerenciados=(setor_id,),
    )
    projeto_repo.obter_por_id.return_value = projeto
    time_repo.obter_por_id.return_value = Time(unidade_id, setor_id, "QA", usuario_id)
    modelo_id, caso_id, execucao_id = uuid4(), uuid4(), uuid4()
    data = datetime(2026, 3, 23)
    resultado_repo.listar_execucoes_form_factor_por_projeto.return_value = PagedResult(
        [
            FormFactorExecucaoLinha(
                execucao_id,
                caso_id,
                "TC-001",
                usuario_id,
                "SDF-1",
                data,
                "SDF",
                {modelo_id: "PASS"},
            )
        ],
        2,
        10,
        11,
    )
    modelo_repo.listar_modelos_do_projeto.return_value = (ModeloDoProjeto(modelo_id, "S25"),)
    service = FormFactorServiceImpl(
        projeto_repo, time_repo, resultado_repo, modelo_repo, AsyncMock(), AsyncMock(), AsyncMock()
    )

    response = await service.listar_resultados(
        usuario,
        projeto.id,
        2,
        10,
        "2026-W13",
        usuario_id,
        "TC-001",
        "SDF-1",
        modelo_id,
        "PASS",
        None,
    )

    inicio = datetime.fromisocalendar(2026, 13, 1)
    resultado_repo.listar_execucoes_form_factor_por_projeto.assert_awaited_once_with(
        unidade_id,
        projeto.id,
        2,
        10,
        inicio,
        inicio + timedelta(days=7),
        usuario_id,
        "TC-001",
        "SDF-1",
        modelo_id,
        "PASS",
        None,
    )
    assert response.items[0].execucao_id == execucao_id
    assert response.items[0].origem == "SDF"
    assert response.items[0].resultados == {modelo_id: "PASS"}


@pytest.mark.parametrize("semana", ["2026-12", "2026-W00", "2026-W54"])
def test_rejeita_semana_que_nao_seja_semana_iso_valida(semana):
    with pytest.raises(ValueError):
        _intervalo_semana_iso(semana)


async def test_perfil_sem_permissao_nao_consulta_form_factor():
    projeto_repo, time_repo, resultado_repo, modelo_repo = (AsyncMock() for _ in range(4))
    usuario = UsuarioAutenticado(uuid4(), uuid4(), "USUARIO_PADRAO")
    service = FormFactorServiceImpl(
        projeto_repo, time_repo, resultado_repo, modelo_repo, AsyncMock(), AsyncMock(), AsyncMock()
    )

    with pytest.raises(ForbiddenException):
        await service.listar(usuario, uuid4(), 1, 10)

    resultado_repo.listar_form_factor_por_projeto.assert_not_awaited()
    modelo_repo.listar_modelos_do_projeto.assert_not_awaited()


async def test_perfil_sem_permissao_nao_consulta_historico_form_factor():
    projeto_repo, time_repo, resultado_repo, modelo_repo = (AsyncMock() for _ in range(4))
    usuario = UsuarioAutenticado(uuid4(), uuid4(), "USUARIO_PADRAO")
    service = FormFactorServiceImpl(
        projeto_repo, time_repo, resultado_repo, modelo_repo, AsyncMock(), AsyncMock(), AsyncMock()
    )

    with pytest.raises(ForbiddenException):
        await service.listar_resultados(usuario, uuid4(), 1, 20)

    resultado_repo.listar_execucoes_form_factor_por_projeto.assert_not_awaited()


async def test_cria_rodada_manual_com_resultados_parciais_e_confirma_transacao():
    projeto_repo, time_repo, resultado_repo, modelo_repo, caso_repo, execucao_repo, uow = (
        AsyncMock() for _ in range(7)
    )
    unidade_id, usuario_id, time_id, setor_id, caso_id, modelo_id = (uuid4() for _ in range(6))
    projeto = Projeto(unidade_id, time_id, "Clock", "9.5")
    caso = CasoTeste(
        unidade_id, projeto.id, "TC-001", "A", "Low", usuario_id, None, "New", exigir_backup=False
    )
    caso.id = caso_id
    usuario = UsuarioAutenticado(
        usuario_id,
        unidade_id,
        "GERENTE",
        permissoes=frozenset({"form_factor.importar"}),
        setores_gerenciados=(setor_id,),
    )
    projeto_repo.obter_por_id.return_value = projeto
    time_repo.obter_por_id.return_value = Time(unidade_id, setor_id, "QA", usuario_id)
    caso_repo.obter_por_id.return_value = caso
    modelo_repo.listar_modelos_do_projeto.return_value = (
        ModeloDoProjeto(modelo_id, "S25"),
        ModeloDoProjeto(uuid4(), "S26"),
    )
    service = FormFactorServiceImpl(
        projeto_repo, time_repo, resultado_repo, modelo_repo, caso_repo, execucao_repo, uow
    )

    response = await service.criar_rodada_manual(
        usuario,
        projeto.id,
        CriarRodadaFormFactorRequest(caso_teste_id=caso_id, resultados={modelo_id: "PASS"}),
    )

    execucao = execucao_repo.adicionar.await_args.args[0]
    assert response.tc_id == "TC-001"
    assert response.origem == "MANUAL" and response.sdf_id is None
    assert response.resultados == {modelo_id: "PASS"}
    assert execucao.importacao_sdf_id is None and execucao.origem == "MANUAL"
    resultado_repo.adicionar.assert_awaited_once()
    uow.commit.assert_awaited_once()
    uow.rollback.assert_not_awaited()


async def test_criacao_manual_sem_permissao_nao_persiste():
    projeto_repo, time_repo, resultado_repo, modelo_repo, caso_repo, execucao_repo, uow = (
        AsyncMock() for _ in range(7)
    )
    usuario = UsuarioAutenticado(uuid4(), uuid4(), "USUARIO_PADRAO")
    service = FormFactorServiceImpl(
        projeto_repo, time_repo, resultado_repo, modelo_repo, caso_repo, execucao_repo, uow
    )

    with pytest.raises(ForbiddenException):
        await service.criar_rodada_manual(
            usuario,
            uuid4(),
            CriarRodadaFormFactorRequest(caso_teste_id=uuid4(), resultados={uuid4(): "PASS"}),
        )

    execucao_repo.adicionar.assert_not_awaited()
    uow.commit.assert_not_awaited()


async def test_criacao_manual_modelo_fora_do_projeto_nao_persiste():
    projeto_repo, time_repo, resultado_repo, modelo_repo, caso_repo, execucao_repo, uow = (
        AsyncMock() for _ in range(7)
    )
    unidade_id, usuario_id, time_id, setor_id, caso_id = (uuid4() for _ in range(5))
    projeto = Projeto(unidade_id, time_id, "Clock", "9.5")
    caso = CasoTeste(
        unidade_id, projeto.id, "TC-001", "A", "Low", usuario_id, None, "New", exigir_backup=False
    )
    caso.id = caso_id
    usuario = UsuarioAutenticado(
        usuario_id,
        unidade_id,
        "GERENTE",
        permissoes=frozenset({"form_factor.importar"}),
        setores_gerenciados=(setor_id,),
    )
    projeto_repo.obter_por_id.return_value = projeto
    time_repo.obter_por_id.return_value = Time(unidade_id, setor_id, "QA", usuario_id)
    caso_repo.obter_por_id.return_value = caso
    modelo_repo.listar_modelos_do_projeto.return_value = ()
    service = FormFactorServiceImpl(
        projeto_repo, time_repo, resultado_repo, modelo_repo, caso_repo, execucao_repo, uow
    )

    with pytest.raises(NotFoundException, match="Modelo não encontrado"):
        await service.criar_rodada_manual(
            usuario,
            projeto.id,
            CriarRodadaFormFactorRequest(caso_teste_id=caso_id, resultados={uuid4(): "PASS"}),
        )

    execucao_repo.adicionar.assert_not_awaited()
    uow.commit.assert_not_awaited()


async def test_criacao_manual_falha_ao_gravar_resultado_faz_rollback():
    projeto_repo, time_repo, resultado_repo, modelo_repo, caso_repo, execucao_repo, uow = (
        AsyncMock() for _ in range(7)
    )
    unidade_id, usuario_id, time_id, setor_id, caso_id, modelo_id = (uuid4() for _ in range(6))
    projeto = Projeto(unidade_id, time_id, "Clock", "9.5")
    caso = CasoTeste(
        unidade_id, projeto.id, "TC-001", "A", "Low", usuario_id, None, "New", exigir_backup=False
    )
    caso.id = caso_id
    usuario = UsuarioAutenticado(
        usuario_id,
        unidade_id,
        "GERENTE",
        permissoes=frozenset({"form_factor.importar"}),
        setores_gerenciados=(setor_id,),
    )
    projeto_repo.obter_por_id.return_value = projeto
    time_repo.obter_por_id.return_value = Time(unidade_id, setor_id, "QA", usuario_id)
    caso_repo.obter_por_id.return_value = caso
    modelo_repo.listar_modelos_do_projeto.return_value = (ModeloDoProjeto(modelo_id, "S25"),)
    resultado_repo.adicionar.side_effect = RuntimeError("db failure")
    service = FormFactorServiceImpl(
        projeto_repo, time_repo, resultado_repo, modelo_repo, caso_repo, execucao_repo, uow
    )

    with pytest.raises(RuntimeError, match="db failure"):
        await service.criar_rodada_manual(
            usuario,
            projeto.id,
            CriarRodadaFormFactorRequest(caso_teste_id=caso_id, resultados={modelo_id: "FAIL"}),
        )

    uow.commit.assert_not_awaited()
    uow.rollback.assert_awaited_once()


@pytest.mark.parametrize("perfil", ["GERENTE", "KP"])
async def test_consulta_form_factor_global_usa_times_do_escopo(perfil):
    projeto_repo, time_repo, resultado_repo, modelo_repo = (AsyncMock() for _ in range(4))
    unidade_id, usuario_id, time_id, projeto_id, modelo_id, caso_id = (uuid4() for _ in range(6))
    usuario = UsuarioAutenticado(
        usuario_id,
        unidade_id,
        perfil,
        permissoes=frozenset({"form_factor.consultar"}),
        times_gerenciados=(time_id,) if perfil == "GERENTE" else (),
        time_ids=(time_id,) if perfil == "KP" else (),
    )
    projeto_repo.listar_por_times.return_value = PagedResult([], 1, 100, 0)
    resultado_repo.listar_form_factor_global.return_value = PagedResult(
        [
            FormFactorLinhaGlobal(
                projeto_id,
                "Clock 9.8",
                caso_id,
                "TC-1",
                usuario_id,
                (modelo_id,),
                None,
                None,
                {modelo_id: "PASS"},
            )
        ],
        1,
        20,
        1,
    )
    resultado_repo.listar_modelos_form_factor_global.return_value = (
        FormFactorModeloGlobal(modelo_id, "SM-123"),
    )
    resultado_repo.listar_responsaveis_form_factor_global.return_value = (
        FormFactorResponsavelGlobal(usuario_id, "ana.souza"),
    )
    service = FormFactorServiceImpl(
        projeto_repo,
        time_repo,
        resultado_repo,
        modelo_repo,
        AsyncMock(),
        AsyncMock(),
        AsyncMock(),
    )

    response = await service.listar_global(usuario, 1, 20)

    projeto_repo.listar_por_times.assert_not_awaited()
    resultado_repo.listar_form_factor_global.assert_awaited_once_with(
        unidade_id, (time_id,), 1, 20, None, None, None, None, None, None, None, None
    )
    resultado_repo.listar_modelos_form_factor_global.assert_awaited_once_with(
        unidade_id, (time_id,), None
    )
    resultado_repo.listar_responsaveis_form_factor_global.assert_awaited_once_with(
        unidade_id, (time_id,), None
    )
    assert response.items[0].projeto_id == projeto_id
    assert response.modelos[0].id == modelo_id
    assert response.responsaveis[0].identificador == "ana.souza"


@pytest.mark.parametrize(
    "perfil,permissoes",
    [
        ("ADMIN_UNIDADE", {"form_factor.consultar"}),
        ("DEV", {"form_factor.consultar"}),
        ("KP", set()),
        ("GERENTE", set()),
    ],
)
async def test_consulta_form_factor_global_recusa_perfil_ou_permissao(perfil, permissoes):
    usuario = UsuarioAutenticado(uuid4(), uuid4(), perfil, permissoes=frozenset(permissoes))
    repos = [AsyncMock() for _ in range(4)]
    service = FormFactorServiceImpl(*repos, AsyncMock(), AsyncMock(), AsyncMock())

    with pytest.raises(ForbiddenException):
        await service.listar_global(usuario, 1, 20)

    repos[2].listar_form_factor_global.assert_not_awaited()
