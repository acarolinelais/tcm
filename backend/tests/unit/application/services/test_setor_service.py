from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from pydantic import ValidationError
from src.application.schemas.setor import CriarSetorRequest
from src.application.services.setor_service import SetorServiceImpl
from src.domain.common.exceptions import ForbiddenException
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.setor import Setor


@pytest.fixture
def contexto():
    repo, uow = AsyncMock(), AsyncMock()
    atual = UsuarioAutenticado(uuid4(), uuid4(), True)
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
    nao_admin = UsuarioAutenticado(atual.id, atual.unidade_id, False)
    with pytest.raises(ForbiddenException):
        await service.criar(nao_admin, CriarSetorRequest(nome="Engenharia"))
    repo.adicionar.assert_not_awaited()
    uow.commit.assert_not_awaited()
