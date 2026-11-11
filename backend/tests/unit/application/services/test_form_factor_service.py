from datetime import datetime, timedelta
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from src.application.schemas.form_factor import (
    CriarRodadaFormFactorLoteRequest,
    CriarRodadaFormFactorRequest,
    EnviarResultadosRodadaRequest,
)
from src.application.services.form_factor_service import (
    FormFactorServiceImpl,
    _intervalo_semana_iso,
)
from src.domain.common.exceptions import (
    ConflictException,
    ForbiddenException,
    NotFoundException,
)
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.caso_teste import CasoTeste, StatusCasoTeste
from src.domain.entities.execucao_sdf import ExecucaoSdf
from src.domain.entities.projeto import Projeto
from src.domain.entities.rodada_form_factor import RodadaFormFactor
from src.domain.entities.time import Time
from src.domain.queries.form_factor_linha import (
    FormFactorExecucaoLinha,
    FormFactorLinha,
)
from src.domain.queries.modelo_do_projeto import ModeloDoProjeto


def _contexto_criar_rodada():
    (
        projeto_repo,
        time_repo,
        resultado_repo,
        modelo_repo,
        caso_repo,
        execucao_repo,
        uow,
        rodada_repo,
    ) = (AsyncMock() for _ in range(8))
    unidade_id, usuario_id, time_id, setor_id = (uuid4() for _ in range(4))
    projeto = Projeto(unidade_id, time_id, "Clock", "9.5")
    casos = [
        CasoTeste(
            unidade_id,
            projeto.id,
            f"TC-{n}",
            "A",
            "Low",
            usuario_id,
            None,
            "New",
            exigir_backup=False,
        )
        for n in range(3)
    ]
    usuario = UsuarioAutenticado(
        usuario_id,
        unidade_id,
        "GERENTE",
        permissoes=frozenset({"form_factor.registrar"}),
        setores_gerenciados=(setor_id,),
    )
    projeto_repo.obter_por_id.return_value = projeto
    time = Time(unidade_id, setor_id, "QA", usuario_id)
    time.id = time_id
    time_repo.obter_por_id.return_value = time
    caso_repo.listar_em_validacao.return_value = casos
    rodada_repo.existe_sdf_id_no_projeto.return_value = False
    service = FormFactorServiceImpl(
        projeto_repo,
        time_repo,
        resultado_repo,
        modelo_repo,
        caso_repo,
        execucao_repo,
        uow,
        rodada_repo,
    )
    return service, usuario, projeto, execucao_repo, rodada_repo, uow


async def test_criar_rodada_captura_todos_os_tcs_em_validacao():
    service, usuario, projeto, execucao_repo, rodada_repo, uow = _contexto_criar_rodada()

    response = await service.criar_rodada(
        usuario, projeto.id, CriarRodadaFormFactorLoteRequest(sdf_id="  SDF #1  ")
    )

    assert response.total_test_cases == 3
    assert response.sdf_id == "SDF #1"
    rodada_repo.existe_sdf_id_no_projeto.assert_awaited_once_with(
        usuario.unidade_id, projeto.id, "SDF #1"
    )
    assert execucao_repo.adicionar.await_count == 3
    assert all(
        call.args[0].rodada_id == response.id
        and call.args[0].sdf_id == "SDF #1"
        and not call.args[0].resultados_registrados
        for call in execucao_repo.adicionar.await_args_list
    )
    uow.commit.assert_awaited_once()


async def test_criar_rodada_com_sdf_id_repetido_recusa_sem_gravar():
    service, usuario, projeto, execucao_repo, rodada_repo, uow = _contexto_criar_rodada()
    rodada_repo.existe_sdf_id_no_projeto.return_value = True

    with pytest.raises(ConflictException, match="SDF ID") as erro:
        await service.criar_rodada(
            usuario, projeto.id, CriarRodadaFormFactorLoteRequest(sdf_id="SDF-001")
        )

    assert erro.value.campo == "sdf_id"
    rodada_repo.adicionar.assert_not_awaited()
    execucao_repo.adicionar.assert_not_awaited()
    uow.commit.assert_not_awaited()


async def test_dev_nao_cria_rodada_mesmo_com_permissao_de_registrar():
    # Spec 059, CA-07: o dev registra o resultado dos próprios casos, mas não cria rodada.
    service, usuario, projeto, execucao_repo, rodada_repo, uow = _contexto_criar_rodada()
    dev = UsuarioAutenticado(
        usuario.id,
        usuario.unidade_id,
        "USUARIO_PADRAO",
        permissoes=frozenset({"form_factor.registrar"}),
        time_ids=(projeto.time_id,),
    )

    with pytest.raises(ForbiddenException):
        await service.criar_rodada(dev, projeto.id, CriarRodadaFormFactorLoteRequest())

    rodada_repo.adicionar.assert_not_awaited()
    execucao_repo.adicionar.assert_not_awaited()
    uow.commit.assert_not_awaited()


async def test_kp_nao_cria_rodada_em_projeto_de_outro_time():
    service, usuario, projeto, execucao_repo, rodada_repo, uow = _contexto_criar_rodada()
    kp = UsuarioAutenticado(
        usuario.id,
        usuario.unidade_id,
        "KP",
        permissoes=frozenset({"form_factor.registrar"}),
        time_ids=(uuid4(),),
    )

    with pytest.raises(NotFoundException):
        await service.criar_rodada(kp, projeto.id, CriarRodadaFormFactorLoteRequest())

    rodada_repo.adicionar.assert_not_awaited()
    uow.commit.assert_not_awaited()


async def test_criar_rodada_sem_sdf_id_nao_verifica_repeticao():
    service, usuario, projeto, _, rodada_repo, uow = _contexto_criar_rodada()

    response = await service.criar_rodada(
        usuario, projeto.id, CriarRodadaFormFactorLoteRequest(sdf_id="")
    )

    assert response.sdf_id is None
    rodada_repo.existe_sdf_id_no_projeto.assert_not_awaited()
    uow.commit.assert_awaited_once()


async def test_registrar_resultado_fail_atualiza_status_e_salva_atomicamente():
    (
        projeto_repo,
        time_repo,
        resultado_repo,
        modelo_repo,
        caso_repo,
        execucao_repo,
        uow,
        rodada_repo,
    ) = (AsyncMock() for _ in range(8))
    unidade_id, usuario_id, time_id, setor_id, modelo_id = (uuid4() for _ in range(5))
    projeto = Projeto(unidade_id, time_id, "Clock", "9.5")
    caso = CasoTeste(
        unidade_id, projeto.id, "TC-1", "A", "Low", usuario_id, uuid4(), "New", exigir_backup=False
    )
    caso.atualizar_campos_do_responsavel(
        StatusCasoTeste.IN_VALIDATION, caso.category, caso.difficulty
    )
    rodada_id = uuid4()
    rodada_repo.obter_no_projeto.return_value = RodadaFormFactor(
        unidade_id, projeto.id, usuario_id, "SDF", datetime.now()
    )
    rodada_repo.obter_no_projeto.return_value.id = rodada_id
    projeto_repo.obter_por_id.return_value = projeto
    time_repo.obter_por_id.return_value = Time(unidade_id, setor_id, "QA", usuario_id)
    caso_repo.obter_por_id.return_value = caso
    execucao_repo.obter_por_rodada_e_caso.return_value = ExecucaoSdf(
        unidade_id,
        None,
        caso.id,
        "SDF",
        datetime.now(),
        projeto.one_ui,
        origem="MANUAL",
        rodada_id=rodada_id,
    )
    execucao_repo.obter_rodada_atual_do_caso.return_value = rodada_id
    modelo_repo.listar_modelos_do_projeto.return_value = (
        ModeloDoProjeto(modelo_id, "S25"),
        ModeloDoProjeto(uuid4(), "S26"),
    )
    usuario = UsuarioAutenticado(
        usuario_id,
        unidade_id,
        "GERENTE",
        permissoes=frozenset({"form_factor.registrar"}),
        setores_gerenciados=(setor_id,),
    )
    service = FormFactorServiceImpl(
        projeto_repo,
        time_repo,
        resultado_repo,
        modelo_repo,
        caso_repo,
        execucao_repo,
        uow,
        rodada_repo,
        contexto_auditoria=(contexto := AsyncMock()),
    )

    response = await service.registrar_resultados_rodada(
        usuario,
        projeto.id,
        rodada_id,
        caso.id,
        EnviarResultadosRodadaRequest(resultados={modelo_id: "FAIL"}),
    )

    assert response.rodada_id == rodada_id and response.sdf_id == "SDF"
    assert caso.status is StatusCasoTeste.IN_FIXES
    assert execucao_repo.atualizar.await_count == 1
    # Spec 073: a falha abre a tentativa 1, e a execução fica nela.
    assert caso.tentativa_correcao == 1
    assert execucao_repo.atualizar.await_args.args[0].tentativa_correcao == 1
    assert caso_repo.atualizar.await_args.args[0] is caso
    resultado_repo.adicionar.assert_awaited_once()
    # Spec 065, CA-09: o registro na rodada confere a finalização de tudo do caso.
    caso_repo.marcar_todos_aprovados.assert_awaited_once_with(unidade_id, projeto.id, (caso.id,))
    uow.commit.assert_awaited_once()
    # A mudança de Status entra no histórico com a origem Form Factor (spec 038, RN-04).
    contexto.definir_origem.assert_awaited_once_with("form_factor")


async def test_registrar_em_rodada_anterior_e_recusado_sem_gravar():
    (
        projeto_repo,
        time_repo,
        resultado_repo,
        modelo_repo,
        caso_repo,
        execucao_repo,
        uow,
        rodada_repo,
    ) = (AsyncMock() for _ in range(8))
    unidade_id, usuario_id, time_id, setor_id = (uuid4() for _ in range(4))
    projeto = Projeto(unidade_id, time_id, "Clock", "9.5")
    caso = CasoTeste(
        unidade_id, projeto.id, "TC-1", "A", "Low", usuario_id, None, "New", exigir_backup=False
    )
    caso.atualizar_campos_do_responsavel(
        StatusCasoTeste.IN_VALIDATION, caso.category, caso.difficulty
    )
    anterior = RodadaFormFactor(unidade_id, projeto.id, usuario_id, "SDF-002", datetime.now())
    rodada_repo.obter_no_projeto.return_value = anterior
    projeto_repo.obter_por_id.return_value = projeto
    time_repo.obter_por_id.return_value = Time(unidade_id, setor_id, "QA", usuario_id)
    caso_repo.obter_por_id.return_value = caso
    execucao_repo.obter_por_rodada_e_caso.return_value = ExecucaoSdf(
        unidade_id,
        None,
        caso.id,
        "SDF-002",
        datetime.now(),
        projeto.one_ui,
        origem="MANUAL",
        rodada_id=anterior.id,
    )
    execucao_repo.obter_rodada_atual_do_caso.return_value = uuid4()
    usuario = UsuarioAutenticado(
        usuario_id,
        unidade_id,
        "GERENTE",
        permissoes=frozenset({"form_factor.registrar"}),
        setores_gerenciados=(setor_id,),
    )
    service = FormFactorServiceImpl(
        projeto_repo,
        time_repo,
        resultado_repo,
        modelo_repo,
        caso_repo,
        execucao_repo,
        uow,
        rodada_repo,
    )

    with pytest.raises(ConflictException):
        await service.registrar_resultados_rodada(
            usuario, projeto.id, anterior.id, caso.id, EnviarResultadosRodadaRequest(resultados={})
        )

    assert caso.status is StatusCasoTeste.IN_VALIDATION
    resultado_repo.adicionar.assert_not_awaited()
    execucao_repo.atualizar.assert_not_awaited()
    caso_repo.marcar_todos_aprovados.assert_not_awaited()
    uow.commit.assert_not_awaited()


async def test_dev_nao_registra_resultado_de_tc_alheio():
    (
        projeto_repo,
        time_repo,
        resultado_repo,
        modelo_repo,
        caso_repo,
        execucao_repo,
        uow,
        rodada_repo,
    ) = (AsyncMock() for _ in range(8))
    unidade_id, usuario_id, time_id, setor_id = (uuid4() for _ in range(4))
    projeto = Projeto(unidade_id, time_id, "Clock", "9.5")
    caso = CasoTeste(unidade_id, projeto.id, "TC-1", "A", "Low", uuid4(), uuid4(), "New")
    rodada = RodadaFormFactor(unidade_id, projeto.id, uuid4(), None, datetime.now())
    projeto_repo.obter_por_id.return_value = projeto
    time = Time(unidade_id, setor_id, "QA", usuario_id)
    time.id = time_id
    time_repo.obter_por_id.return_value = time
    rodada_repo.obter_no_projeto.return_value = rodada
    caso_repo.obter_por_id.return_value = caso
    execucao_repo.obter_por_rodada_e_caso.return_value = ExecucaoSdf(
        unidade_id,
        None,
        caso.id,
        None,
        datetime.now(),
        projeto.one_ui,
        origem="MANUAL",
        rodada_id=rodada.id,
    )
    dev = UsuarioAutenticado(
        usuario_id,
        unidade_id,
        "USUARIO_PADRAO",
        permissoes=frozenset({"form_factor.registrar", "test_cases.consultar"}),
        time_ids=(time_id,),
    )
    service = FormFactorServiceImpl(
        projeto_repo,
        time_repo,
        resultado_repo,
        modelo_repo,
        caso_repo,
        execucao_repo,
        uow,
        rodada_repo,
        contexto_auditoria=(contexto := AsyncMock()),
    )

    with pytest.raises(ForbiddenException):
        await service.registrar_resultados_rodada(
            dev, projeto.id, rodada.id, caso.id, EnviarResultadosRodadaRequest(resultados={})
        )

    resultado_repo.adicionar.assert_not_awaited()
    uow.commit.assert_not_awaited()
    contexto.definir_origem.assert_not_awaited()


@pytest.mark.parametrize("vinculo", ["responsavel", "backup"])
async def test_dev_atribuido_registra_resultado_parcial(vinculo):
    (
        projeto_repo,
        time_repo,
        resultado_repo,
        modelo_repo,
        caso_repo,
        execucao_repo,
        uow,
        rodada_repo,
    ) = (AsyncMock() for _ in range(8))
    unidade_id, principal_id, backup_id, time_id, setor_id, modelo_id = (uuid4() for _ in range(6))
    dev_id = principal_id if vinculo == "responsavel" else backup_id
    projeto = Projeto(unidade_id, time_id, "Clock", "9.5")
    caso = CasoTeste(unidade_id, projeto.id, "TC-1", "A", "Low", principal_id, backup_id, "New")
    caso.atualizar_campos_do_responsavel(
        StatusCasoTeste.IN_VALIDATION, caso.category, caso.difficulty
    )
    rodada = RodadaFormFactor(unidade_id, projeto.id, principal_id, None, datetime.now())
    projeto_repo.obter_por_id.return_value = projeto
    time = Time(unidade_id, setor_id, "QA", principal_id)
    time.id = time_id
    time_repo.obter_por_id.return_value = time
    rodada_repo.obter_no_projeto.return_value = rodada
    caso_repo.obter_por_id.return_value = caso
    execucao_repo.obter_por_rodada_e_caso.return_value = ExecucaoSdf(
        unidade_id,
        None,
        caso.id,
        None,
        datetime.now(),
        projeto.one_ui,
        origem="MANUAL",
        rodada_id=rodada.id,
    )
    execucao_repo.obter_rodada_atual_do_caso.return_value = rodada.id
    modelo_repo.listar_modelos_do_projeto.return_value = (
        ModeloDoProjeto(modelo_id, "S25"),
        ModeloDoProjeto(uuid4(), "S26"),
    )
    dev = UsuarioAutenticado(
        dev_id,
        unidade_id,
        "USUARIO_PADRAO",
        permissoes=frozenset({"form_factor.registrar", "test_cases.consultar"}),
        time_ids=(time_id,),
    )
    service = FormFactorServiceImpl(
        projeto_repo,
        time_repo,
        resultado_repo,
        modelo_repo,
        caso_repo,
        execucao_repo,
        uow,
        rodada_repo,
    )

    await service.registrar_resultados_rodada(
        dev,
        projeto.id,
        rodada.id,
        caso.id,
        EnviarResultadosRodadaRequest(resultados={modelo_id: "PASS"}),
    )

    assert caso.status is StatusCasoTeste.IN_VALIDATION
    caso_repo.atualizar.assert_awaited_once_with(caso)
    resultado_repo.adicionar.assert_awaited_once()
    uow.commit.assert_awaited_once()


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
    caso_repo = AsyncMock()
    caso_elegivel = CasoTeste(
        unidade_id,
        projeto.id,
        "TC-ELIGIBLE",
        "A",
        "Low",
        usuario_id,
        None,
        "New",
        status=StatusCasoTeste.IN_VALIDATION,
        exigir_backup=False,
    )
    caso_repo.listar_em_validacao.return_value = (caso_elegivel,)
    service = FormFactorServiceImpl(
        projeto_repo, time_repo, resultado_repo, modelo_repo, caso_repo, AsyncMock(), AsyncMock()
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
    assert [caso.tc_id for caso in resultado.casos_elegiveis] == ["TC-ELIGIBLE"]


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
        permissoes=frozenset({"form_factor.registrar"}),
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
    caso_repo.marcar_todos_aprovados.assert_awaited_once_with(unidade_id, projeto.id, (caso_id,))
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
        permissoes=frozenset({"form_factor.registrar"}),
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
        permissoes=frozenset({"form_factor.registrar"}),
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


async def test_gerente_membro_consulta_form_factor_e_sem_relacao_nao():
    projeto_repo, time_repo, resultado_repo, modelo_repo = (AsyncMock() for _ in range(4))
    unidade_id, time_id = uuid4(), uuid4()
    projeto = Projeto(unidade_id, time_id, "Clock", "9.5")
    time = Time(unidade_id, uuid4(), "QA", uuid4())
    time.id = time_id
    projeto_repo.obter_por_id.return_value = projeto
    time_repo.obter_por_id.return_value = time
    resultado_repo.listar_form_factor_por_projeto.return_value = PagedResult([], 1, 20, 0)
    modelo_repo.listar_modelos_do_projeto.return_value = ()
    service = FormFactorServiceImpl(
        projeto_repo,
        time_repo,
        resultado_repo,
        modelo_repo,
        AsyncMock(),
        AsyncMock(),
        AsyncMock(),
    )

    def gerente(time_ids):
        return UsuarioAutenticado(
            uuid4(),
            unidade_id,
            "GERENTE",
            permissoes=frozenset({"form_factor.consultar"}),
            setores_gerenciados=(uuid4(),),
            time_ids=time_ids,
        )

    resposta = await service.listar(gerente((time_id,)), projeto.id, 1, 20)
    with pytest.raises(NotFoundException):
        await service.listar(gerente((uuid4(),)), projeto.id, 1, 20)

    assert resposta.total_count == 0
    resultado_repo.listar_form_factor_por_projeto.assert_awaited_once()
