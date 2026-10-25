from datetime import UTC
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from pydantic import ValidationError
from src.application.schemas.projeto import (
    AtualizarStatusProjetoRequest,
    CriarProjetoRequest,
)
from src.application.services.projeto_service import ProjetoServiceImpl
from src.domain.common.exceptions import ConflictException, ForbiddenException, NotFoundException
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.modelo_dispositivo import ModeloDispositivo
from src.domain.entities.projeto import Projeto, StatusProjeto
from src.domain.entities.time import Time


@pytest.fixture
def contexto():
    projeto_repo, time_repo, modelo_repo, vinculo_repo, uow = [AsyncMock() for _ in range(5)]
    vinculo_repo.listar_nomes_por_projetos.return_value = {}
    vinculo_repo.listar_ids_por_projetos.return_value = {}
    unidade_id, time_id, setor_id, usuario_id = (uuid4() for _ in range(4))
    time = Time(unidade_id, setor_id, "Clock", usuario_id)
    time.id = time_id
    time_repo.obter_por_id.return_value = time
    modelo_repo.listar_por_ids.return_value = ()
    projeto_repo.obter_por_id.return_value = None
    usuario = UsuarioAutenticado(
        usuario_id,
        unidade_id,
        "ADMIN_UNIDADE",
        permissoes=frozenset(),
    )
    service = ProjetoServiceImpl(projeto_repo, time_repo, modelo_repo, vinculo_repo, uow)
    request = CriarProjetoRequest(time_id=time_id, app="Clock", one_ui="9.5")
    return service, projeto_repo, time_repo, modelo_repo, vinculo_repo, uow, usuario, time, request


async def test_admin_cria_projeto_em_time_da_unidade(contexto):
    service, projetos, times, _, _, uow, admin, time, request = contexto

    resposta = await service.criar(admin, request)

    times.obter_por_id.assert_awaited_once_with(admin.unidade_id, time.id)
    projeto = projetos.adicionar.call_args.args[0]
    assert resposta.id == projeto.id
    assert resposta.time_id == time.id
    assert resposta.nome == "Clock 9.5"
    assert resposta.status.value == "Created"
    projetos.adicionar.assert_awaited_once_with(projeto)
    uow.commit.assert_awaited_once_with()


@pytest.mark.parametrize("perfil", ["USUARIO_PADRAO", "KP", "GERENTE", "ADMIN_UNIDADE"])
async def test_listar_associados_resolve_identidade_e_escopo(contexto, perfil):
    service, projetos, _, _, _, _, admin, time, _ = contexto
    usuario = UsuarioAutenticado(
        admin.id,
        admin.unidade_id,
        perfil,
        permissoes=frozenset({"test_cases.consultar"}),
        time_ids=(time.id,),
        times_gerenciados=(time.id,),
    )
    projetos.listar_associados_por_times.return_value = PagedResult([], 1, 1, 0)

    resposta = await service.listar(usuario, 1, 1, True)

    assert resposta.total_count == 0
    projetos.listar_associados_por_times.assert_awaited_once_with(
        usuario.unidade_id,
        None if perfil == "ADMIN_UNIDADE" else (time.id,),
        usuario.id,
        1,
        1,
    )


async def test_listar_associados_sem_permissao_nao_consulta_repositorio(contexto):
    service, projetos, _, _, _, _, admin, _, _ = contexto
    usuario = UsuarioAutenticado(admin.id, admin.unidade_id, "USUARIO_PADRAO")
    with pytest.raises(ForbiddenException):
        await service.listar(usuario, 1, 20, True)
    projetos.listar_associados_por_times.assert_not_awaited()


@pytest.mark.parametrize("perfil", ["GERENTE", "KP"])
async def test_gerente_e_kp_criam_projeto_no_escopo(contexto, perfil):
    service, projetos, _, _, _, uow, admin, time, request = contexto
    usuario = UsuarioAutenticado(
        admin.id,
        admin.unidade_id,
        perfil,
        permissoes=frozenset({"projetos.gerenciar"}),
        setores_gerenciados=(time.setor_id,) if perfil == "GERENTE" else (),
        time_ids=(time.id,) if perfil == "KP" else (),
    )

    resposta = await service.criar(usuario, request)

    assert resposta.time_id == time.id
    projetos.adicionar.assert_awaited_once()
    uow.commit.assert_awaited_once()


async def test_gerente_membro_cria_projeto_no_time(contexto):
    service, projetos, _, _, _, uow, admin, time, request = contexto
    gerente = UsuarioAutenticado(
        admin.id,
        admin.unidade_id,
        "GERENTE",
        permissoes=frozenset({"projetos.gerenciar"}),
        setores_gerenciados=(uuid4(),),
        time_ids=(time.id,),
    )

    resposta = await service.criar(gerente, request)

    assert resposta.time_id == time.id
    uow.commit.assert_awaited_once()


async def test_developer_membro_nao_cria_projeto(contexto):
    service, projetos, _, _, _, uow, admin, time, request = contexto
    developer = UsuarioAutenticado(
        admin.id,
        admin.unidade_id,
        "USUARIO_PADRAO",
        permissoes=frozenset({"projetos.gerenciar"}),
        time_ids=(time.id,),
    )

    with pytest.raises(ForbiddenException):
        await service.criar(developer, request)

    projetos.adicionar.assert_not_awaited()
    uow.commit.assert_not_awaited()


async def test_gerente_ou_kp_fora_do_escopo_nao_cria_projeto(contexto):
    service, projetos, _, _, vinculos, uow, admin, _, request = contexto
    usuario = UsuarioAutenticado(
        admin.id,
        admin.unidade_id,
        "GERENTE",
        permissoes=frozenset({"projetos.gerenciar"}),
        setores_gerenciados=(uuid4(),),
    )

    with pytest.raises(ForbiddenException):
        await service.criar(usuario, request)

    projetos.adicionar.assert_not_awaited()
    vinculos.adicionar.assert_not_awaited()
    uow.commit.assert_not_awaited()


@pytest.mark.parametrize("causa", ["nao_encontrado", "inativo"])
async def test_time_inexistente_ou_inativo_nao_cria_projeto(contexto, causa):
    service, projetos, times, _, _, uow, admin, time, request = contexto
    times.obter_por_id.return_value = None if causa == "nao_encontrado" else time
    time.ativo = causa != "inativo"

    erro = NotFoundException if causa == "nao_encontrado" else ConflictException
    with pytest.raises(erro):
        await service.criar(admin, request)

    projetos.adicionar.assert_not_awaited()
    uow.commit.assert_not_awaited()


async def test_criar_projeto_associa_modelos_ativos_da_unidade(contexto):
    service, projetos, _, modelos_repo, vinculos, uow, admin, time, _ = contexto
    modelo = ModeloDispositivo(admin.unidade_id, "S27 Ultra")
    modelos_repo.listar_por_ids.return_value = (modelo,)
    request = CriarProjetoRequest(
        time_id=time.id, app="Clock", one_ui="9.5", modelos_ids=[modelo.id]
    )

    await service.criar(admin, request)

    modelos_repo.listar_por_ids.assert_awaited_once_with(admin.unidade_id, (modelo.id,))
    projeto = projetos.adicionar.call_args.args[0]
    vinculos.adicionar.assert_awaited_once()
    vinculo = vinculos.adicionar.call_args.args[0]
    assert vinculo.projeto_id == projeto.id
    assert vinculo.modelo_dispositivo_id == modelo.id
    uow.commit.assert_awaited_once()


async def test_modelo_inexistente_inativo_ou_de_outra_unidade_falha(contexto):
    service, projetos, _, modelos_repo, vinculos, uow, admin, time, _ = contexto
    modelos_repo.listar_por_ids.return_value = ()
    request = CriarProjetoRequest(time_id=time.id, app="Clock", one_ui="9.5", modelos_ids=[uuid4()])

    with pytest.raises(ConflictException):
        await service.criar(admin, request)

    projetos.adicionar.assert_not_awaited()
    vinculos.adicionar.assert_not_awaited()
    uow.commit.assert_not_awaited()


async def test_projeto_rejeita_modelos_duplicados_no_request(contexto):
    service, projetos, _, modelos_repo, vinculos, uow, admin, time, _ = contexto
    modelo_id = uuid4()
    request = CriarProjetoRequest(
        time_id=time.id, app="Clock", one_ui="9.5", modelos_ids=[modelo_id, modelo_id]
    )

    with pytest.raises(ConflictException):
        await service.criar(admin, request)

    modelos_repo.listar_por_ids.assert_not_awaited()
    projetos.adicionar.assert_not_awaited()
    vinculos.adicionar.assert_not_awaited()
    uow.commit.assert_not_awaited()


@pytest.mark.parametrize("campo", ["app", "one_ui"])
def test_campos_do_projeto_nao_aceitam_texto_vazio(campo):
    valores = {"time_id": uuid4(), "app": "Clock", "one_ui": "9.5"}
    valores[campo] = "  "

    with pytest.raises(ValidationError):
        CriarProjetoRequest(**valores)


async def test_admin_lista_projetos_da_unidade(contexto):
    service, projetos, _, _, _, _, admin, time, _ = contexto
    projeto = Projeto(admin.unidade_id, time.id, "Clock", "9.5")
    projetos.listar_paginado.return_value = PagedResult([projeto], 1, 10, 1)

    resultado = await service.listar(admin, 1, 10)

    projetos.listar_paginado.assert_awaited_once_with(admin.unidade_id, 1, 10)
    assert resultado.items[0].id == projeto.id


@pytest.mark.parametrize("perfil", ["GERENTE", "KP"])
async def test_gerente_e_kp_listam_projetos_dos_times_no_escopo(contexto, perfil):
    service, projetos, _, _, _, _, admin, time, _ = contexto
    time_ids = (time.id, uuid4())
    usuario = UsuarioAutenticado(
        admin.id,
        admin.unidade_id,
        perfil,
        permissoes=frozenset({"projetos.consultar"}),
        times_gerenciados=time_ids if perfil == "GERENTE" else (),
        time_ids=time_ids if perfil == "KP" else (),
    )
    projetos.listar_por_times.return_value = PagedResult([], 2, 5, 0)

    resultado = await service.listar(usuario, 2, 5)

    projetos.listar_por_times.assert_awaited_once_with(usuario.unidade_id, time_ids, 2, 5)
    assert (resultado.page, resultado.page_size, resultado.total_count) == (2, 5, 0)


async def test_gerente_membro_lista_projetos_do_time(contexto):
    service, projetos, _, _, _, _, admin, time, _ = contexto
    do_setor = uuid4()
    gerente = UsuarioAutenticado(
        admin.id,
        admin.unidade_id,
        "GERENTE",
        permissoes=frozenset({"projetos.consultar"}),
        times_gerenciados=(do_setor,),
        time_ids=(time.id,),
    )
    projetos.listar_por_times.return_value = PagedResult([], 1, 20, 0)

    await service.listar(gerente, 1, 20)

    projetos.listar_por_times.assert_awaited_once_with(
        gerente.unidade_id, (do_setor, time.id), 1, 20
    )


async def test_usuario_sem_permissao_nao_consulta_projetos(contexto):
    service, projetos, _, _, _, _, admin, _, _ = contexto
    membro = UsuarioAutenticado(admin.id, admin.unidade_id, "USUARIO_PADRAO")

    with pytest.raises(ForbiddenException):
        await service.listar(membro, 1, 10)

    projetos.listar_paginado.assert_not_awaited()
    projetos.listar_por_times.assert_not_awaited()


async def test_atualizar_status_manualmente_preserva_created_at(contexto):
    service, projetos, times, _, _, uow, usuario, time, _ = contexto
    from datetime import datetime

    gerente = UsuarioAutenticado(
        usuario.id,
        usuario.unidade_id,
        "GERENTE",
        permissoes=frozenset({"projetos.gerenciar"}),
        setores_gerenciados=(time.setor_id,),
    )
    projeto = Projeto(usuario.unidade_id, time.id, "Clock", "9.5")
    criado_em = datetime(2026, 1, 1, tzinfo=UTC)
    projeto.created_at = criado_em
    projetos.obter_por_id.return_value = projeto

    resposta = await service.atualizar_status(
        gerente,
        projeto.id,
        AtualizarStatusProjetoRequest(status=StatusProjeto.IN_PROGRESS),
    )

    assert projeto.status is StatusProjeto.IN_PROGRESS
    assert projeto.created_at == criado_em
    assert resposta.status is StatusProjeto.IN_PROGRESS
    times.obter_por_id.assert_awaited_once_with(gerente.unidade_id, time.id)
    projetos.atualizar.assert_awaited_once_with(projeto)
    uow.commit.assert_awaited_once()


async def test_status_de_projeto_fora_do_escopo_e_recusado(contexto):
    service, projetos, _, _, _, uow, admin, time, _ = contexto
    gerente = UsuarioAutenticado(
        admin.id,
        admin.unidade_id,
        "GERENTE",
        permissoes=frozenset({"projetos.gerenciar"}),
        setores_gerenciados=(uuid4(),),
    )
    projeto = Projeto(admin.unidade_id, time.id, "Clock", "9.5")
    projetos.obter_por_id.return_value = projeto

    with pytest.raises(ForbiddenException):
        await service.atualizar_status(
            gerente,
            projeto.id,
            AtualizarStatusProjetoRequest(status=StatusProjeto.COMPLETED),
        )

    projetos.atualizar.assert_not_awaited()
    uow.commit.assert_not_awaited()


async def test_status_projeto_inexistente_e_recusado(contexto):
    service, projetos, _, _, _, uow, admin, _, _ = contexto
    projetos.obter_por_id.return_value = None

    with pytest.raises(NotFoundException):
        await service.atualizar_status(
            admin,
            uuid4(),
            AtualizarStatusProjetoRequest(status=StatusProjeto.CANCELED),
        )

    projetos.atualizar.assert_not_awaited()
    uow.commit.assert_not_awaited()
