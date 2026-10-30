from datetime import UTC, datetime
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from pydantic import ValidationError
from src.application.schemas.caso_teste import AtualizarCasoTesteRequest, CriarCasoTesteRequest
from src.application.schemas.link_pull_request import AdicionarLinkPullRequestRequest
from src.application.services.caso_teste_service import CasoTesteServiceImpl
from src.domain.common.cor_avatar import CorAvatar
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
from src.domain.entities.link_pull_request import LinkPullRequest
from src.domain.entities.projeto import Projeto
from src.domain.entities.time import Time
from src.domain.entities.time_membro import TimeMembro
from src.domain.entities.usuario import Usuario
from src.domain.queries.caso_teste_com_responsavel import CasoTesteComResponsavel
from src.domain.queries.link_pull_request_com_autor import LinkPullRequestComAutor


@pytest.fixture
def contexto():
    casos, projetos, times, membros, usuarios, links, uow = [AsyncMock() for _ in range(7)]
    unidade_id, time_id, setor_id, projeto_id, kp_id = (uuid4() for _ in range(5))
    time = Time(unidade_id, setor_id, "Clock", kp_id)
    time.id = time_id
    projeto = Projeto(unidade_id, time_id, "Clock", "9.5")
    projeto.id = projeto_id
    times.obter_por_id.return_value = time
    projetos.obter_por_id.return_value = projeto
    casos.obter_por_id.return_value = None
    casos.existe_tc_id.return_value = False
    service = CasoTesteServiceImpl(casos, projetos, times, membros, usuarios, links, uow)
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
    justificativa = {"justificativa_exclusao": "Fora do escopo"} if novo == "Cancelled" else {}

    resposta = await service.atualizar(
        dev, caso.id, AtualizarCasoTesteRequest(status=novo, **justificativa)
    )

    assert resposta.status == novo
    assert resposta.justificativa_exclusao == justificativa.get("justificativa_exclusao")
    uow.commit.assert_awaited_once()


async def test_backup_e_dev_sem_vinculo_nao_mudam_status(contexto):
    service, casos, _, _, _, _, uow, admin, projeto, time = contexto
    backup, caso = _dev_e_caso(admin, projeto, time, "InReview", vinculo="backup")
    casos.obter_por_id.return_value = caso

    with pytest.raises(ForbiddenException):
        await service.atualizar(backup, caso.id, AtualizarCasoTesteRequest(status="InValidation"))
    alheio, _ = _dev_e_caso(admin, projeto, time, "InReview", vinculo="nenhum")
    with pytest.raises(ForbiddenException):
        await service.atualizar(
            alheio,
            caso.id,
            AtualizarCasoTesteRequest(status="Cancelled", justificativa_exclusao="Fora do escopo"),
        )
    assert caso.status is StatusCasoTeste.IN_REVIEW
    uow.commit.assert_not_awaited()


async def test_backup_exclui_tc_atribuido_com_justificativa(contexto):
    service, casos, _, _, _, _, uow, admin, projeto, time = contexto
    backup, caso = _dev_e_caso(admin, projeto, time, "InReview", vinculo="backup")
    casos.obter_por_id.return_value = caso

    resposta = await service.atualizar(
        backup,
        caso.id,
        AtualizarCasoTesteRequest(status="Cancelled", justificativa_exclusao="Fora do escopo"),
    )

    assert resposta.status is StatusCasoTeste.CANCELLED
    assert resposta.justificativa_exclusao == "Fora do escopo"
    uow.commit.assert_awaited_once()


async def test_gestor_exclui_com_justificativa_e_reativar_apaga(contexto):
    service, casos, _, _, _, _, uow, admin, projeto, time = contexto
    _, caso = _dev_e_caso(admin, projeto, time, "InReview")
    casos.obter_por_id.return_value = caso

    excluido = await service.atualizar(
        admin,
        caso.id,
        AtualizarCasoTesteRequest(status="Cancelled", justificativa_exclusao="Fora do escopo"),
    )
    assert excluido.justificativa_exclusao == "Fora do escopo"

    reativado = await service.atualizar(admin, caso.id, AtualizarCasoTesteRequest(status="To-Do"))

    assert reativado.status is StatusCasoTeste.TO_DO
    assert reativado.justificativa_exclusao is None


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


# Spec 030: links de PR do Test Case.
URL_PR = "https://github.sec.samsung.net/org/repo/pull/12"


@pytest.fixture
def links_contexto(contexto):
    service, casos, _, _, _, _, uow, admin, projeto, time = contexto
    caso = CasoTeste(
        admin.unidade_id,
        projeto.id,
        "clock_000001",
        CategoriaCasoTeste.A,
        DificuldadeCasoTeste.LOW,
        uuid4(),
        uuid4(),
        SituacaoCasoTeste.NEW,
    )
    casos.obter_por_id.return_value = caso
    links = service._link_repo
    links.existe_ativo.return_value = False
    links.obter_por_id.return_value = None

    def usuario(perfil, *permissoes, no_time=True):
        return UsuarioAutenticado(
            uuid4(),
            admin.unidade_id,
            perfil,
            nome=f"Pessoa {perfil}",
            permissoes=frozenset({"test_cases.consultar", *permissoes}),
            time_ids=(time.id,) if no_time else (),
        )

    return service, casos, links, uow, caso, usuario


def link_do_caso(caso, autor_id=None):
    link = LinkPullRequest(caso.unidade_id, caso.id, URL_PR, autor_id or uuid4())
    link.created_at = datetime(2026, 10, 28, 12, 0)
    return link


async def test_dev_adiciona_link_com_ele_como_autor(links_contexto):
    service, _, links, uow, caso, usuario = links_contexto
    dev = usuario("USUARIO_PADRAO")
    links.obter_por_id.side_effect = lambda *_: links.adicionar.call_args.args[0]

    resposta = await service.adicionar_pull_request(
        dev, caso.id, AdicionarLinkPullRequestRequest(url=f"  {URL_PR} ")
    )

    link = links.adicionar.call_args.args[0]
    assert (link.caso_teste_id, link.url, link.created_by) == (caso.id, URL_PR, dev.id)
    assert (resposta.url, resposta.created_by) == (URL_PR, dev.id)
    assert resposta.created_by_nome == "Pessoa USUARIO_PADRAO"
    links.existe_ativo.assert_awaited_once_with(dev.unidade_id, caso.id, URL_PR)
    uow.commit.assert_awaited_once()


async def test_link_ativo_repetido_e_recusado_sem_gravar(links_contexto):
    service, _, links, uow, caso, usuario = links_contexto
    links.existe_ativo.return_value = True

    with pytest.raises(ConflictException, match="já está registrado"):
        await service.adicionar_pull_request(
            usuario("USUARIO_PADRAO"), caso.id, AdicionarLinkPullRequestRequest(url=URL_PR)
        )

    links.adicionar.assert_not_awaited()
    uow.commit.assert_not_awaited()


@pytest.mark.parametrize(
    ("perfil", "permissoes", "pode"),
    [
        ("ADMIN_UNIDADE", (), True),
        ("GERENTE", ("test_cases.gerenciar",), True),
        ("KP", ("test_cases.gerenciar",), True),
        ("USUARIO_PADRAO", (), False),
    ],
)
async def test_listagem_diz_quem_pode_remover(links_contexto, perfil, permissoes, pode):
    service, _, links, _, caso, usuario = links_contexto
    link = link_do_caso(caso)
    links.listar_ativos_por_caso.return_value = (LinkPullRequestComAutor(link, "Ana"),)

    resposta = await service.listar_pull_requests(usuario(perfil, *permissoes), caso.id)

    assert resposta.pode_remover is pode
    assert [(item.id, item.created_by_nome) for item in resposta.itens] == [(link.id, "Ana")]


@pytest.mark.parametrize("perfil", ["GERENTE", "KP"])
async def test_gestao_remove_link_de_outra_pessoa(links_contexto, perfil):
    service, _, links, uow, caso, usuario = links_contexto
    link = link_do_caso(caso)
    links.obter_por_id.return_value = link

    await service.remover_pull_request(usuario(perfil, "test_cases.gerenciar"), caso.id, link.id)

    assert link.ativo is False
    links.atualizar.assert_awaited_once_with(link)
    uow.commit.assert_awaited_once()


async def test_dev_nao_remove_nem_o_proprio_link(links_contexto):
    service, _, links, uow, caso, usuario = links_contexto
    dev = usuario("USUARIO_PADRAO")
    link = link_do_caso(caso, autor_id=dev.id)
    links.obter_por_id.return_value = link

    with pytest.raises(ForbiddenException):
        await service.remover_pull_request(dev, caso.id, link.id)

    assert link.ativo is True
    links.atualizar.assert_not_awaited()
    uow.commit.assert_not_awaited()


@pytest.mark.parametrize("situacao", ["inexistente", "removido", "de_outro_caso"])
async def test_remover_link_que_nao_esta_ativo_no_caso_retorna_nao_encontrado(
    links_contexto, situacao
):
    service, _, links, uow, caso, usuario = links_contexto
    if situacao == "removido":
        link = link_do_caso(caso)
        link.inativar()
        links.obter_por_id.return_value = link
    elif situacao == "de_outro_caso":
        links.obter_por_id.return_value = LinkPullRequest(caso.unidade_id, uuid4(), URL_PR, uuid4())

    with pytest.raises(NotFoundException, match="Link de PR"):
        await service.remover_pull_request(usuario("KP", "test_cases.gerenciar"), caso.id, uuid4())

    links.atualizar.assert_not_awaited()
    uow.commit.assert_not_awaited()


@pytest.mark.parametrize("motivo", ["caso_inexistente", "fora_do_escopo"])
async def test_links_de_caso_inacessivel_retornam_nao_encontrado(links_contexto, motivo):
    service, casos, links, uow, caso, usuario = links_contexto
    pessoa = usuario("KP", "test_cases.gerenciar", no_time=motivo != "fora_do_escopo")
    if motivo == "caso_inexistente":
        casos.obter_por_id.return_value = None

    with pytest.raises(NotFoundException):
        await service.listar_pull_requests(pessoa, caso.id)
    with pytest.raises(NotFoundException):
        await service.adicionar_pull_request(
            pessoa, caso.id, AdicionarLinkPullRequestRequest(url=URL_PR)
        )
    with pytest.raises(NotFoundException):
        await service.remover_pull_request(pessoa, caso.id, uuid4())

    links.listar_ativos_por_caso.assert_not_awaited()
    links.adicionar.assert_not_awaited()
    uow.commit.assert_not_awaited()


def card(projeto, responsavel_id, status, tc_id, backup_id=None):
    caso = CasoTeste(
        projeto.unidade_id,
        projeto.id,
        tc_id,
        CategoriaCasoTeste.A,
        DificuldadeCasoTeste.LOW,
        responsavel_id,
        backup_id,
        SituacaoCasoTeste.NEW,
        status,
        exigir_backup=False,
    )
    return CasoTesteComResponsavel(caso, f"Pessoa {responsavel_id}", CorAvatar.AZUL)


async def test_obter_kanban_agrupa_nas_sete_colunas_na_ordem_do_ciclo(contexto):
    service, casos, _, _, _, _, _, admin, projeto, _ = contexto
    casos.listar_cards_por_projeto.return_value = (
        card(projeto, uuid4(), StatusCasoTeste.IN_REVIEW, "Clock_001"),
        card(projeto, uuid4(), StatusCasoTeste.IN_REVIEW, "Clock_002"),
        card(projeto, uuid4(), StatusCasoTeste.DONE, "Clock_003"),
    )

    kanban = await service.obter_kanban(admin, projeto.id)

    assert [coluna.status for coluna in kanban.colunas] == [
        StatusCasoTeste.TO_DO,
        StatusCasoTeste.IN_PROGRESS,
        StatusCasoTeste.IN_REVIEW,
        StatusCasoTeste.IN_VALIDATION,
        StatusCasoTeste.IN_FIXES,
        StatusCasoTeste.DONE,
        StatusCasoTeste.CANCELLED,
    ]
    assert [coluna.total for coluna in kanban.colunas] == [0, 0, 2, 0, 0, 1, 0]
    assert kanban.total == 3
    # A gestão pode mover para qualquer outro Status.
    destinos = kanban.colunas[2].casos[0].destinos
    assert StatusCasoTeste.IN_REVIEW not in destinos
    assert len(destinos) == 6


async def test_obter_kanban_dev_ve_todos_e_destinos_seguem_a_posse(contexto):
    service, casos, _, _, _, _, _, _, projeto, time = contexto
    dev_id = uuid4()
    dev = UsuarioAutenticado(
        dev_id,
        projeto.unidade_id,
        "USUARIO_PADRAO",
        permissoes=frozenset({"test_cases.consultar"}),
        time_ids=(time.id,),
    )
    casos.listar_cards_por_projeto.return_value = (
        card(projeto, dev_id, StatusCasoTeste.TO_DO, "Clock_001"),
        card(projeto, uuid4(), StatusCasoTeste.IN_PROGRESS, "Clock_002", backup_id=dev_id),
        card(projeto, uuid4(), StatusCasoTeste.CANCELLED, "Clock_003", backup_id=dev_id),
        card(projeto, uuid4(), StatusCasoTeste.IN_REVIEW, "Clock_004"),
    )

    kanban = await service.obter_kanban(dev, projeto.id)
    destinos = {c.tc_id: c.destinos for coluna in kanban.colunas for c in coluna.casos}

    assert kanban.total == 4
    assert len(destinos["Clock_001"]) == 6
    assert destinos["Clock_002"] == [StatusCasoTeste.CANCELLED]
    assert destinos["Clock_003"] == []
    assert destinos["Clock_004"] == []


async def test_obter_kanban_fora_do_escopo_ou_sem_permissao_falha(contexto):
    service, casos, _, _, _, _, _, _, projeto, _ = contexto
    fora = UsuarioAutenticado(
        uuid4(),
        projeto.unidade_id,
        "USUARIO_PADRAO",
        permissoes=frozenset({"test_cases.consultar"}),
        time_ids=(uuid4(),),
    )
    sem_permissao = UsuarioAutenticado(uuid4(), projeto.unidade_id, "USUARIO_PADRAO")

    with pytest.raises(NotFoundException):
        await service.obter_kanban(fora, projeto.id)
    with pytest.raises(ForbiddenException):
        await service.obter_kanban(sem_permissao, projeto.id)
    casos.listar_cards_por_projeto.assert_not_called()
