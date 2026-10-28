from datetime import UTC, datetime
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from pydantic import ValidationError
from src.application.schemas.caso_teste import AtualizarCasoTesteRequest, CriarCasoTesteRequest
from src.application.services.caso_teste_service import CasoTesteServiceImpl
from src.domain.common.exceptions import ConflictException, ForbiddenException, NotFoundException
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.caso_teste import (
    CasoTeste,
    CategoriaCasoTeste,
    DificuldadeCasoTeste,
    NivelAutomacaoCasoTeste,
    SituacaoCasoTeste,
    StatusCasoTeste,
)
from src.domain.entities.projeto import Projeto
from src.domain.entities.time import Time
from src.domain.entities.time_membro import TimeMembro
from src.domain.entities.usuario import Usuario


@pytest.fixture
def contexto():
    casos, projetos, times, membros, usuarios, uow = [AsyncMock() for _ in range(6)]
    unidade_id, time_id, setor_id, projeto_id, kp_id = (uuid4() for _ in range(5))
    time = Time(unidade_id, setor_id, "Clock", kp_id)
    time.id = time_id
    projeto = Projeto(unidade_id, time_id, "Clock", "9.5")
    projeto.id = projeto_id
    times.obter_por_id.return_value = time
    projetos.obter_por_id.return_value = projeto
    casos.obter_por_id.return_value = None
    casos.existe_tc_id.return_value = False
    service = CasoTesteServiceImpl(casos, projetos, times, membros, usuarios, uow)
    admin = UsuarioAutenticado(kp_id, unidade_id, "ADMIN_UNIDADE")
    return service, casos, projetos, times, membros, usuarios, uow, admin, projeto, time


def request_criar(responsavel_id=None, backup_id=None, tc_id="Clock_001"):
    return CriarCasoTesteRequest(
        tc_id=tc_id,
        category=CategoriaCasoTeste.A,
        difficulty=DificuldadeCasoTeste.LOW,
        situation=SituacaoCasoTeste.WITHOUT_CHANGES,
        responsavel_id=responsavel_id or uuid4(),
        backup_id=backup_id or uuid4(),
    )


def tornar_membro(membros, usuarios, unidade_id, time_id, usuario_id):
    usuario = Usuario(unidade_id, f"Usuário {usuario_id}", f"{usuario_id}@example.com")
    membro = TimeMembro(unidade_id, time_id, usuario_id)
    usuarios.obter_por_id.return_value = usuario
    membros.obter_por_time_e_usuario.return_value = membro
    return usuario, membro


async def test_developer_lista_todos_test_cases_do_projeto_visivel(contexto):
    service, casos, _, _, _, _, _, _, projeto, time = contexto
    developer_id = uuid4()
    developer = UsuarioAutenticado(
        developer_id,
        projeto.unidade_id,
        "USUARIO_PADRAO",
        permissoes=frozenset({"test_cases.consultar"}),
        time_ids=(time.id,),
    )
    casos.listar_por_projeto.return_value = PagedResult([], 1, 10, 0)

    await service.listar(developer, projeto.id, 1, 10)

    casos.listar_por_projeto.assert_awaited_once_with(
        developer.unidade_id, projeto.id, 1, 10, None, priorizar_responsavel_id=developer_id
    )


async def test_lista_repassa_filtro_de_responsavel_ao_repositorio(contexto):
    service, casos, _, _, _, _, _, admin, projeto, _ = contexto
    responsavel_id = uuid4()
    casos.listar_por_projeto.return_value = PagedResult([], 1, 10, 0)

    await service.listar(admin, projeto.id, 1, 10, responsavel_id)

    casos.listar_por_projeto.assert_awaited_once_with(
        admin.unidade_id, projeto.id, 1, 10, responsavel_id, priorizar_responsavel_id=admin.id
    )


async def test_lista_pessoal_inclui_identidade_autenticada(contexto):
    service, casos, _, _, _, _, _, admin, projeto, _ = contexto
    casos.listar_por_projeto.return_value = PagedResult([], 1, 10, 0)
    await service.listar(admin, projeto.id, 1, 10, associados_a_mim=True)
    casos.listar_por_projeto.assert_awaited_once_with(
        admin.unidade_id,
        projeto.id,
        1,
        10,
        None,
        priorizar_responsavel_id=admin.id,
        associado_usuario_id=admin.id,
    )


async def test_lista_por_semana_combina_data_final_e_associacao(contexto):
    service, casos, _, _, _, _, _, admin, projeto, _ = contexto
    casos.listar_por_projeto.return_value = PagedResult([], 1, 10, 0)
    await service.listar(
        admin,
        projeto.id,
        1,
        10,
        associados_a_mim=True,
        semana="2026-W13",
        fuso_horario="America/Manaus",
    )
    casos.listar_por_projeto.assert_awaited_once_with(
        admin.unidade_id,
        projeto.id,
        1,
        10,
        None,
        priorizar_responsavel_id=admin.id,
        associado_usuario_id=admin.id,
        data_final_inicio=datetime(2026, 3, 23, 4),
        data_final_fim=datetime(2026, 3, 30, 4),
    )


async def test_lista_pessoal_projeto_inativo_nao_consulta_casos(contexto):
    service, casos, _, _, _, _, _, admin, projeto, _ = contexto
    projeto.ativo = False
    with pytest.raises(NotFoundException):
        await service.listar(admin, projeto.id, 1, 10, associados_a_mim=True)
    casos.listar_por_projeto.assert_not_awaited()


async def test_criar_caso_valido_com_responsavel_e_backup_do_time(contexto):
    service, casos, _, _, membros, usuarios, uow, admin, projeto, time = contexto
    request = request_criar()
    tornar_membro(membros, usuarios, admin.unidade_id, time.id, request.responsavel_id)
    tornar_membro(membros, usuarios, admin.unidade_id, time.id, request.backup_id)

    resposta = await service.criar(admin, projeto.id, request)

    caso = casos.adicionar.call_args.args[0]
    assert resposta.id == caso.id
    assert resposta.tc_id == "Clock_001"
    assert resposta.situation is SituacaoCasoTeste.WITHOUT_CHANGES
    assert resposta.status is StatusCasoTeste.TO_DO
    assert resposta.responsavel_id == request.responsavel_id
    assert resposta.backup_id == request.backup_id
    assert casos.existe_tc_id.await_count == 1
    assert membros.obter_por_time_e_usuario.await_count == 2
    casos.adicionar.assert_awaited_once_with(caso)
    uow.commit.assert_awaited_once()


async def test_criar_caso_com_tc_id_duplicado_falha_sem_commit(contexto):
    service, casos, _, _, membros, _, uow, admin, projeto, _ = contexto
    casos.existe_tc_id.return_value = True
    casos.existe_tc_id.return_value = True

    with pytest.raises(ConflictException, match="TC ID"):
        await service.criar(admin, projeto.id, request_criar())

    membros.obter_por_time_e_usuario.assert_not_awaited()
    casos.adicionar.assert_not_awaited()
    uow.commit.assert_not_awaited()


async def test_responsavel_inativo_ou_fora_do_time_falha(contexto):
    service, casos, _, _, membros, usuarios, uow, admin, projeto, time = contexto
    request = request_criar()
    usuarios.obter_por_id.return_value = Usuario(admin.unidade_id, "Pessoa", "pessoa@example.com")
    membros.obter_por_time_e_usuario.return_value = None

    with pytest.raises(ConflictException, match="usuários ativos do time"):
        await service.criar(admin, projeto.id, request)

    casos.adicionar.assert_not_awaited()
    uow.commit.assert_not_awaited()


async def test_responsavel_principal_e_backup_iguais_falham_sem_gravar(contexto):
    service, casos, _, _, membros, _, uow, admin, projeto, _ = contexto
    usuario_id = uuid4()

    with pytest.raises(ConflictException, match="distintas"):
        await service.criar(admin, projeto.id, request_criar(usuario_id, usuario_id))

    membros.obter_por_time_e_usuario.assert_not_awaited()
    casos.adicionar.assert_not_awaited()
    uow.commit.assert_not_awaited()


@pytest.mark.parametrize("perfil", ["GERENTE", "KP"])
async def test_gerente_e_kp_criam_casos_dentro_do_escopo(contexto, perfil):
    service, casos, _, _, membros, usuarios, uow, admin, projeto, time = contexto
    gerente_ou_kp = UsuarioAutenticado(
        admin.id,
        admin.unidade_id,
        perfil,
        permissoes=frozenset({"test_cases.gerenciar"}),
        setores_gerenciados=(time.setor_id,) if perfil == "GERENTE" else (),
        time_ids=(time.id,) if perfil == "KP" else (),
    )
    request = request_criar()
    tornar_membro(membros, usuarios, admin.unidade_id, time.id, request.responsavel_id)
    tornar_membro(membros, usuarios, admin.unidade_id, time.id, request.backup_id)

    await service.criar(gerente_ou_kp, projeto.id, request)

    casos.adicionar.assert_awaited_once()
    uow.commit.assert_awaited_once()


async def test_gerente_fora_do_setor_nao_cria_caso(contexto):
    service, casos, _, _, membros, _, uow, admin, projeto, _ = contexto
    gerente = UsuarioAutenticado(
        admin.id,
        admin.unidade_id,
        "GERENTE",
        permissoes=frozenset({"test_cases.gerenciar"}),
        setores_gerenciados=(uuid4(),),
    )

    with pytest.raises(NotFoundException):
        await service.criar(gerente, projeto.id, request_criar())

    membros.obter_por_time_e_usuario.assert_not_awaited()
    casos.adicionar.assert_not_awaited()
    uow.commit.assert_not_awaited()


def gerente_membro(
    admin, time, permissoes=frozenset({"test_cases.consultar", "test_cases.gerenciar"})
):
    """Gerente que participa do time, mas não gerencia o setor dele (ADR 0036)."""
    return UsuarioAutenticado(
        uuid4(),
        admin.unidade_id,
        "GERENTE",
        permissoes=permissoes,
        setores_gerenciados=(uuid4(),),
        time_ids=(time.id,),
    )


async def test_gerente_membro_consulta_e_gerencia_casos_do_time(contexto):
    service, casos, _, _, membros, usuarios, uow, admin, projeto, time = contexto
    gerente = gerente_membro(admin, time)
    casos.listar_por_projeto.return_value = PagedResult([], 1, 20, 0)
    request = request_criar()
    tornar_membro(membros, usuarios, admin.unidade_id, time.id, request.responsavel_id)
    caso_de_outro = CasoTeste(
        admin.unidade_id,
        projeto.id,
        "Clock_002",
        CategoriaCasoTeste.A,
        DificuldadeCasoTeste.LOW,
        uuid4(),
        uuid4(),
        SituacaoCasoTeste.NEW,
    )
    casos.obter_por_id.return_value = caso_de_outro

    await service.listar(gerente, projeto.id, 1, 20)
    await service.criar(gerente, projeto.id, request)
    resposta = await service.atualizar(
        gerente,
        caso_de_outro.id,
        AtualizarCasoTesteRequest(
            status=StatusCasoTeste.IN_REVIEW, responsavel_id=request.responsavel_id
        ),
    )

    casos.listar_por_projeto.assert_awaited_once()
    casos.adicionar.assert_awaited_once()
    assert resposta.status is StatusCasoTeste.IN_REVIEW
    assert resposta.responsavel_id == request.responsavel_id
    assert uow.commit.await_count == 2


async def test_gerente_membro_sem_permissao_nao_cria_caso(contexto):
    service, casos, _, _, _, _, uow, admin, projeto, time = contexto
    gerente = gerente_membro(admin, time, permissoes=frozenset({"test_cases.consultar"}))

    with pytest.raises(ForbiddenException):
        await service.criar(gerente, projeto.id, request_criar())

    casos.adicionar.assert_not_awaited()
    uow.commit.assert_not_awaited()


async def test_atualizar_caso_proprio_permite_campos_do_responsavel(contexto):
    service, casos, _, _, _, _, uow, admin, projeto, time = contexto
    responsavel = UsuarioAutenticado(
        uuid4(),
        admin.unidade_id,
        "USUARIO_PADRAO",
        permissoes=frozenset({"test_cases.consultar"}),
        time_ids=(time.id,),
    )
    caso = CasoTeste(
        admin.unidade_id,
        projeto.id,
        "Clock_001",
        CategoriaCasoTeste.A,
        DificuldadeCasoTeste.LOW,
        responsavel.id,
        uuid4(),
        SituacaoCasoTeste.NEW,
    )
    caso.created_at = datetime(2026, 1, 1, tzinfo=UTC)
    casos.obter_por_id.return_value = caso

    resposta = await service.atualizar(
        responsavel,
        caso.id,
        AtualizarCasoTesteRequest(
            category=CategoriaCasoTeste.B,
            difficulty=DificuldadeCasoTeste.MEDIUM,
            status=StatusCasoTeste.IN_PROGRESS,
            situation=SituacaoCasoTeste.NEW_STEP,
        ),
    )

    assert resposta.category is CategoriaCasoTeste.B
    assert resposta.difficulty is DificuldadeCasoTeste.MEDIUM
    assert resposta.status is StatusCasoTeste.IN_PROGRESS
    assert resposta.situation is SituacaoCasoTeste.NEW_STEP
    assert resposta.created_at == caso.created_at
    casos.atualizar.assert_awaited_once_with(caso)
    uow.commit.assert_awaited_once()


def _usuario_do_time(admin, time):
    return UsuarioAutenticado(
        uuid4(),
        admin.unidade_id,
        "USUARIO_PADRAO",
        permissoes=frozenset({"test_cases.consultar"}),
        time_ids=(time.id,),
    )


def _caso_de(admin, projeto, responsavel_id, automation_level=None):
    return CasoTeste(
        admin.unidade_id,
        projeto.id,
        "Clock_001",
        CategoriaCasoTeste.A,
        DificuldadeCasoTeste.LOW,
        responsavel_id,
        uuid4(),
        SituacaoCasoTeste.NEW,
        automation_level=automation_level,
    )


async def test_criar_caso_com_e_sem_automation_level(contexto):
    service, casos, _, _, membros, usuarios, _, admin, projeto, time = contexto
    for nivel in (NivelAutomacaoCasoTeste.NAO_AUTOMATIZAVEL, None):
        request = request_criar()
        request.automation_level = nivel
        tornar_membro(membros, usuarios, admin.unidade_id, time.id, request.responsavel_id)
        tornar_membro(membros, usuarios, admin.unidade_id, time.id, request.backup_id)

        resposta = await service.criar(admin, projeto.id, request)

        assert casos.adicionar.call_args.args[0].automation_level is nivel
        assert resposta.automation_level is nivel


async def test_responsavel_define_automation_level_do_proprio_caso(contexto):
    service, casos, _, _, _, _, uow, admin, projeto, time = contexto
    responsavel = _usuario_do_time(admin, time)
    caso = _caso_de(admin, projeto, responsavel.id)
    casos.obter_por_id.return_value = caso

    resposta = await service.atualizar(
        responsavel, caso.id, AtualizarCasoTesteRequest(automation_level=2)
    )

    assert resposta.automation_level is NivelAutomacaoCasoTeste.PARCIALMENTE_AUTOMATIZAVEL
    casos.atualizar.assert_awaited_once()
    uow.commit.assert_awaited_once()


async def test_gestao_define_automation_level_de_qualquer_caso(contexto):
    service, casos, _, _, _, _, uow, admin, projeto, _ = contexto
    caso = _caso_de(admin, projeto, uuid4())
    casos.obter_por_id.return_value = caso

    resposta = await service.atualizar(
        admin, caso.id, AtualizarCasoTesteRequest(automation_level=3)
    )

    assert resposta.automation_level is NivelAutomacaoCasoTeste.TOTALMENTE_AUTOMATIZAVEL
    uow.commit.assert_awaited_once()


async def test_atualizar_outro_campo_mantem_o_automation_level(contexto):
    service, casos, _, _, _, _, _, admin, projeto, _ = contexto
    caso = _caso_de(admin, projeto, uuid4(), NivelAutomacaoCasoTeste.NAO_AUTOMATIZAVEL)
    casos.obter_por_id.return_value = caso

    resposta = await service.atualizar(
        admin, caso.id, AtualizarCasoTesteRequest(category=CategoriaCasoTeste.B)
    )

    assert resposta.automation_level is NivelAutomacaoCasoTeste.NAO_AUTOMATIZAVEL


async def test_responsavel_nao_altera_automation_level_de_caso_alheio(contexto):
    service, casos, _, _, _, _, uow, admin, projeto, time = contexto
    caso = _caso_de(admin, projeto, uuid4())
    casos.obter_por_id.return_value = caso

    with pytest.raises(ForbiddenException, match="atribuídos a você"):
        await service.atualizar(
            _usuario_do_time(admin, time), caso.id, AtualizarCasoTesteRequest(automation_level=2)
        )

    assert caso.automation_level is None
    casos.atualizar.assert_not_awaited()
    uow.commit.assert_not_awaited()


async def test_backup_nao_altera_automation_level(contexto):
    service, casos, _, _, _, _, uow, admin, projeto, time = contexto
    backup = _usuario_do_time(admin, time)
    caso = _caso_de(admin, projeto, uuid4())
    caso.backup_id = backup.id
    casos.obter_por_id.return_value = caso

    with pytest.raises(ForbiddenException):
        await service.atualizar(backup, caso.id, AtualizarCasoTesteRequest(automation_level=1))

    assert caso.automation_level is None
    uow.commit.assert_not_awaited()


@pytest.mark.parametrize("nivel", [0, 4, -1, 1.5, 2.0, "2", "abc", True])
def test_requests_recusam_automation_level_fora_de_1_a_3(nivel):
    with pytest.raises(ValidationError):
        AtualizarCasoTesteRequest(automation_level=nivel)
    with pytest.raises(ValidationError):
        CriarCasoTesteRequest(
            tc_id="Clock_001",
            category=CategoriaCasoTeste.A,
            difficulty=DificuldadeCasoTeste.LOW,
            situation=SituacaoCasoTeste.NEW,
            responsavel_id=uuid4(),
            backup_id=uuid4(),
            automation_level=nivel,
        )


async def test_responsavel_nao_edita_atribuicao_nem_caso_de_outra_pessoa(contexto):
    service, casos, _, _, _, _, uow, admin, projeto, time = contexto
    responsavel = UsuarioAutenticado(
        uuid4(),
        admin.unidade_id,
        "USUARIO_PADRAO",
        permissoes=frozenset({"test_cases.consultar"}),
        time_ids=(time.id,),
    )
    caso = CasoTeste(
        admin.unidade_id,
        projeto.id,
        "Clock_001",
        CategoriaCasoTeste.A,
        DificuldadeCasoTeste.LOW,
        uuid4(),
        uuid4(),
        SituacaoCasoTeste.NEW,
    )
    casos.obter_por_id.return_value = caso

    with pytest.raises(ForbiddenException):
        await service.atualizar(
            responsavel,
            caso.id,
            AtualizarCasoTesteRequest(category=CategoriaCasoTeste.B),
        )

    casos.atualizar.assert_not_awaited()
    uow.commit.assert_not_awaited()

    caso.responsavel_id = responsavel.id
    with pytest.raises(ForbiddenException, match="responsável só pode editar"):
        await service.atualizar(
            responsavel,
            caso.id,
            AtualizarCasoTesteRequest(responsavel_id=uuid4()),
        )
    with pytest.raises(ForbiddenException, match="responsável só pode editar"):
        await service.atualizar(
            responsavel,
            caso.id,
            AtualizarCasoTesteRequest(backup_id=uuid4()),
        )
    assert caso.situation is SituacaoCasoTeste.NEW
    casos.atualizar.assert_not_awaited()
    uow.commit.assert_not_awaited()


def _dev_e_caso(admin, projeto, time, status, *, vinculo="responsavel"):
    dev = UsuarioAutenticado(
        uuid4(),
        admin.unidade_id,
        "USUARIO_PADRAO",
        permissoes=frozenset({"test_cases.consultar"}),
        time_ids=(time.id,),
    )
    principal = dev.id if vinculo == "responsavel" else uuid4()
    backup = dev.id if vinculo == "backup" else uuid4()
    caso = CasoTeste(
        admin.unidade_id,
        projeto.id,
        "Clock_001",
        CategoriaCasoTeste.A,
        DificuldadeCasoTeste.LOW,
        principal,
        backup,
        SituacaoCasoTeste.NEW,
        status,
    )
    return dev, caso


@pytest.mark.parametrize(
    ("atual", "novo"),
    [
        ("To-Do", "InProgress"),
        ("To-Do", "InValidation"),
        ("InProgress", "To-Do"),
        ("InValidation", "Done"),
        ("InValidation", "InFixes"),
        ("Done", "Cancelled"),
        ("Cancelled", "InProgress"),
    ],
)
async def test_responsavel_altera_o_status_livremente(contexto, atual, novo):
    service, casos, _, _, _, _, uow, admin, projeto, time = contexto
    dev, caso = _dev_e_caso(admin, projeto, time, atual)
    casos.obter_por_id.return_value = caso

    resposta = await service.atualizar(dev, caso.id, AtualizarCasoTesteRequest(status=novo))

    assert resposta.status == novo
    uow.commit.assert_awaited_once()


async def test_backup_e_dev_sem_vinculo_nao_mudam_status(contexto):
    service, casos, _, _, _, _, uow, admin, projeto, time = contexto
    backup, caso = _dev_e_caso(admin, projeto, time, "InReview", vinculo="backup")
    casos.obter_por_id.return_value = caso

    with pytest.raises(ForbiddenException):
        await service.atualizar(backup, caso.id, AtualizarCasoTesteRequest(status="InValidation"))
    alheio, _ = _dev_e_caso(admin, projeto, time, "InReview", vinculo="nenhum")
    with pytest.raises(ForbiddenException):
        await service.atualizar(alheio, caso.id, AtualizarCasoTesteRequest(status="Cancelled"))
    assert caso.status is StatusCasoTeste.IN_REVIEW
    uow.commit.assert_not_awaited()


async def test_backup_exclui_tc_atribuido(contexto):
    service, casos, _, _, _, _, uow, admin, projeto, time = contexto
    backup, caso = _dev_e_caso(admin, projeto, time, "InReview", vinculo="backup")
    casos.obter_por_id.return_value = caso

    resposta = await service.atualizar(
        backup, caso.id, AtualizarCasoTesteRequest(status="Cancelled")
    )

    assert resposta.status is StatusCasoTeste.CANCELLED
    uow.commit.assert_awaited_once()


async def test_kp_no_escopo_aprova_pr_movendo_para_validacao(contexto):
    service, casos, _, _, _, _, uow, admin, projeto, time = contexto
    kp = UsuarioAutenticado(
        uuid4(),
        admin.unidade_id,
        "KP",
        permissoes=frozenset({"test_cases.consultar", "test_cases.gerenciar"}),
        time_ids=(time.id,),
    )
    _, caso = _dev_e_caso(admin, projeto, time, "InReview")
    casos.obter_por_id.return_value = caso

    resposta = await service.atualizar(
        kp, caso.id, AtualizarCasoTesteRequest(status="InValidation")
    )

    assert resposta.status is StatusCasoTeste.IN_VALIDATION
    uow.commit.assert_awaited_once()


async def test_gestor_pode_reatribuir_caso_a_membros_ativos(contexto):
    service, casos, _, _, membros, usuarios, uow, admin, projeto, time = contexto
    responsavel_id, backup_id = uuid4(), uuid4()
    tornar_membro(membros, usuarios, admin.unidade_id, time.id, responsavel_id)
    tornar_membro(membros, usuarios, admin.unidade_id, time.id, backup_id)
    caso = CasoTeste(
        admin.unidade_id,
        projeto.id,
        "Clock_001",
        CategoriaCasoTeste.A,
        DificuldadeCasoTeste.LOW,
        uuid4(),
        uuid4(),
        SituacaoCasoTeste.NEW,
    )
    casos.obter_por_id.return_value = caso

    resposta = await service.atualizar(
        admin,
        caso.id,
        AtualizarCasoTesteRequest(responsavel_id=responsavel_id, backup_id=backup_id),
    )

    assert resposta.responsavel_id == responsavel_id
    assert resposta.backup_id == backup_id
    assert membros.obter_por_time_e_usuario.await_count == 2
    casos.atualizar.assert_awaited_once_with(caso)
    uow.commit.assert_awaited_once()


async def test_gestor_altera_situation_e_status(contexto):
    service, casos, _, _, membros, _, uow, admin, projeto, _ = contexto
    caso = CasoTeste(
        admin.unidade_id,
        projeto.id,
        "Clock_001",
        CategoriaCasoTeste.A,
        DificuldadeCasoTeste.LOW,
        uuid4(),
        uuid4(),
        SituacaoCasoTeste.NEW,
    )
    casos.obter_por_id.return_value = caso

    resposta = await service.atualizar(
        admin,
        caso.id,
        AtualizarCasoTesteRequest(
            situation=SituacaoCasoTeste.NEW_STEP, status=StatusCasoTeste.DONE
        ),
    )

    assert resposta.situation is SituacaoCasoTeste.NEW_STEP
    assert resposta.status is StatusCasoTeste.DONE
    membros.obter_por_time_e_usuario.assert_not_awaited()
    uow.commit.assert_awaited_once()


async def test_responsavel_transfere_para_backup_e_vira_o_backup(contexto):
    service, casos, _, _, _, _, uow, admin, projeto, time = contexto
    backup_id = uuid4()
    responsavel = UsuarioAutenticado(
        uuid4(),
        admin.unidade_id,
        "USUARIO_PADRAO",
        permissoes=frozenset({"test_cases.consultar"}),
        time_ids=(time.id,),
    )
    caso = CasoTeste(
        admin.unidade_id,
        projeto.id,
        "Clock_001",
        CategoriaCasoTeste.A,
        DificuldadeCasoTeste.LOW,
        responsavel.id,
        backup_id,
        SituacaoCasoTeste.NEW,
    )
    casos.obter_por_id.return_value = caso

    resposta = await service.transferir_para_backup(responsavel, caso.id)

    assert resposta.responsavel_id == backup_id
    assert resposta.backup_id == responsavel.id
    casos.atualizar.assert_awaited_once_with(caso)
    uow.commit.assert_awaited_once()


async def test_usuario_que_nao_e_responsavel_nao_transfere_caso(contexto):
    service, casos, _, _, _, _, uow, admin, projeto, time = contexto
    usuario = UsuarioAutenticado(
        uuid4(),
        admin.unidade_id,
        "USUARIO_PADRAO",
        permissoes=frozenset({"test_cases.consultar"}),
        time_ids=(time.id,),
    )
    caso = CasoTeste(
        admin.unidade_id,
        projeto.id,
        "Clock_001",
        CategoriaCasoTeste.A,
        DificuldadeCasoTeste.LOW,
        uuid4(),
        uuid4(),
        SituacaoCasoTeste.NEW,
    )
    casos.obter_por_id.return_value = caso

    with pytest.raises(ForbiddenException, match="responsável principal"):
        await service.transferir_para_backup(usuario, caso.id)

    casos.atualizar.assert_not_awaited()
    uow.commit.assert_not_awaited()


async def test_transferir_sem_backup_falha_sem_persistir(contexto):
    service, casos, _, _, _, _, uow, admin, projeto, time = contexto
    usuario = UsuarioAutenticado(
        uuid4(),
        admin.unidade_id,
        "USUARIO_PADRAO",
        permissoes=frozenset({"test_cases.consultar"}),
        time_ids=(time.id,),
    )
    caso = CasoTeste(
        admin.unidade_id,
        projeto.id,
        "Clock_001",
        CategoriaCasoTeste.A,
        DificuldadeCasoTeste.LOW,
        usuario.id,
        uuid4(),
        SituacaoCasoTeste.NEW,
    )
    caso.backup_id = None
    casos.obter_por_id.return_value = caso

    with pytest.raises(ConflictException, match="não possui backup"):
        await service.transferir_para_backup(usuario, caso.id)

    casos.atualizar.assert_not_awaited()
    uow.commit.assert_not_awaited()


def test_atualizacao_vazia_ou_com_campo_extra_e_rejeitada():
    with pytest.raises(ValidationError):
        AtualizarCasoTesteRequest()
    with pytest.raises(ValidationError):
        AtualizarCasoTesteRequest(nome="outro")


@pytest.mark.parametrize("situation", [None, "To-Do", "Changed"])
def test_criar_sem_situation_valida_e_rejeitado(situation):
    dados = {
        "tc_id": "Clock_001",
        "category": "A",
        "difficulty": "Low",
        "responsavel_id": uuid4(),
        "backup_id": uuid4(),
    }
    if situation is not None:
        dados["situation"] = situation

    with pytest.raises(ValidationError, match="situation"):
        CriarCasoTesteRequest(**dados)


def test_atualizar_com_status_invalido_e_rejeitado():
    with pytest.raises(ValidationError, match="status"):
        AtualizarCasoTesteRequest(status="New")
