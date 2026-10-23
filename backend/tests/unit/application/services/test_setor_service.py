from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from pydantic import ValidationError
from src.application.schemas.setor import AtualizarSetorRequest, CriarSetorRequest
from src.application.services.setor_service import SetorServiceImpl
from src.domain.common.exceptions import ConflictException, ForbiddenException, NotFoundException
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.setor import Setor


@pytest.fixture
def contexto():
    repo, uow = AsyncMock(), AsyncMock()
    atual = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    return SetorServiceImpl(repo, uow), repo, uow, atual


async def test_criar_setor_valido_persiste_na_unidade_autenticada(contexto):
    service, repo, uow, atual = contexto
    resposta = await service.criar(atual, CriarSetorRequest(nome="Engenharia"))
    setor = repo.adicionar.call_args.args[0]
    assert resposta.id == setor.id
    assert resposta.unidade_id == atual.unidade_id
    assert resposta.nome == "Engenharia"
    repo.adicionar.assert_awaited_once_with(setor)
    uow.commit.assert_awaited_once_with()


async def test_listar_setores_filtra_unidade_e_preserva_paginacao(contexto):
    service, repo, uow, atual = contexto
    setor = Setor(atual.unidade_id, "Engenharia")
    repo.listar_paginado.return_value = PagedResult([setor], 2, 10, 15)
    resposta = await service.listar(atual, 2, 10)
    repo.listar_paginado.assert_awaited_once_with(atual.unidade_id, 2, 10)
    assert resposta.items[0].id == setor.id
    assert (resposta.page, resposta.page_size, resposta.total_count) == (2, 10, 15)
    uow.commit.assert_not_awaited()


async def test_criar_setor_nome_vazio_falha_sem_persistir(contexto):
    service, repo, uow, atual = contexto
    with pytest.raises(ValidationError):
        await service.criar(atual, CriarSetorRequest(nome=""))
    repo.adicionar.assert_not_awaited()
    uow.commit.assert_not_awaited()


async def test_criar_setor_sem_admin_falha_sem_persistir(contexto):
    service, repo, uow, atual = contexto
    nao_admin = UsuarioAutenticado(atual.id, atual.unidade_id, "USUARIO_PADRAO")
    with pytest.raises(ForbiddenException):
        await service.criar(nao_admin, CriarSetorRequest(nome="Engenharia"))
    repo.adicionar.assert_not_awaited()
    uow.commit.assert_not_awaited()


async def test_inativar_setor_com_times_ativos_e_recusado_sem_alteracoes():
    repo, uow, gerentes, usuarios = AsyncMock(), AsyncMock(), AsyncMock(), AsyncMock()
    admin = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    setor = Setor(admin.unidade_id, "Engenharia")
    repo.obter_por_id.return_value = setor
    repo.possui_times_ativos.return_value = True
    service = SetorServiceImpl(repo, uow, gerentes, usuarios)

    with pytest.raises(ConflictException):
        await service.atualizar(admin, setor.id, AtualizarSetorRequest(ativo=False))

    repo.atualizar.assert_not_awaited()
    gerentes.inativar_por_setor.assert_not_awaited()
    uow.commit.assert_not_awaited()


async def test_inativar_setor_sem_times_inativa_vinculos_e_invalida_sessoes():
    repo, uow, gerentes, usuarios = AsyncMock(), AsyncMock(), AsyncMock(), AsyncMock()
    admin = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    setor = Setor(admin.unidade_id, "Engenharia")
    gerente_id = uuid4()
    repo.obter_por_id.return_value = setor
    repo.possui_times_ativos.return_value = False
    gerentes.inativar_por_setor.return_value = (gerente_id,)
    service = SetorServiceImpl(repo, uow, gerentes, usuarios)

    response = await service.atualizar(admin, setor.id, AtualizarSetorRequest(ativo=False))

    assert response.ativo is False
    gerentes.inativar_por_setor.assert_awaited_once_with(admin.unidade_id, setor.id)
    usuarios.invalidar_sessoes.assert_awaited_once_with(gerente_id)
    repo.atualizar.assert_awaited_once_with(setor)
    uow.commit.assert_awaited_once()


async def test_associar_gerente_ativo_da_unidade():
    setores, gerentes, usuarios, uow = AsyncMock(), AsyncMock(), AsyncMock(), AsyncMock()
    admin = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    gerente_id = uuid4()
    setor = Setor(admin.unidade_id, "Engenharia")
    setores.obter_por_id.return_value = setor
    gerentes.obter.return_value = None
    usuarios.gerente_ativo_na_unidade.return_value = True
    service = SetorServiceImpl(setores, uow, gerentes, usuarios)

    response = await service.associar_gerente(admin, setor.id, gerente_id)

    assert response.usuario_id == gerente_id
    assert response.ativo is True
    gerentes.adicionar.assert_awaited_once()
    usuarios.invalidar_sessoes.assert_awaited_once_with(gerente_id)
    uow.commit.assert_awaited_once()


async def test_associar_usuario_que_nao_e_gerente_ativo_e_recusado():
    setores, gerentes, usuarios, uow = AsyncMock(), AsyncMock(), AsyncMock(), AsyncMock()
    admin = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    setor = Setor(admin.unidade_id, "Engenharia")
    setores.obter_por_id.return_value = setor
    usuarios.gerente_ativo_na_unidade.return_value = False
    service = SetorServiceImpl(setores, uow, gerentes, usuarios)

    with pytest.raises(NotFoundException):
        await service.associar_gerente(admin, setor.id, uuid4())

    gerentes.adicionar.assert_not_awaited()
    uow.commit.assert_not_awaited()
