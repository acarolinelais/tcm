from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from src.application.schemas.time import (
    AdicionarMembroRequest,
    CriarTimeRequest,
)
from src.application.services.time_service import TimeServiceImpl
from src.domain.common.exceptions import ConflictException, ForbiddenException, NotFoundException
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.time import Time
from src.domain.entities.time_membro import TimeMembro


@pytest.fixture
def contexto():
    repo, setores, membros, usuarios, uow = [AsyncMock() for _ in range(5)]
    atual = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    time = Time(atual.unidade_id, uuid4(), "Backend", atual.id)
    repo.obter_por_id.return_value = time
    membros.obter_por_time_e_usuario.return_value = None
    service = TimeServiceImpl(repo, setores, membros, usuarios, uow)
    return service, repo, setores, membros, usuarios, uow, atual, time


async def test_criar_time_valido_valida_setor_e_gerente_na_unidade(contexto):
    service, repo, setores, _, usuarios, uow, atual, time = contexto
    resposta = await service.criar(
        atual, CriarTimeRequest(nome=time.nome, setor_id=time.setor_id, gerente_id=atual.id)
    )
    setores.obter_por_id.assert_awaited_once_with(atual.unidade_id, time.setor_id)
    usuarios.obter_por_id.assert_awaited_once_with(atual.unidade_id, atual.id)
    assert resposta.gerente_id == atual.id
    assert resposta.unidade_id == atual.unidade_id
    repo.adicionar.assert_awaited_once()
    uow.commit.assert_awaited_once_with()


@pytest.mark.parametrize("recurso", ["setor", "gerente"])
async def test_criar_time_referencia_inexistente_ou_outra_unidade_falha(contexto, recurso):
    service, repo, setores, _, usuarios, uow, atual, time = contexto
    (setores if recurso == "setor" else usuarios).obter_por_id.return_value = None
    with pytest.raises(NotFoundException):
        await service.criar(
            atual, CriarTimeRequest(nome=time.nome, setor_id=time.setor_id, gerente_id=atual.id)
        )
    repo.adicionar.assert_not_awaited()
    uow.commit.assert_not_awaited()


@pytest.mark.parametrize("filtrar", [False, True])
async def test_listar_times_repassa_unidade_setor_e_paginacao(contexto, filtrar):
    service, repo, _, _, _, uow, atual, time = contexto
    setor_id = time.setor_id if filtrar else None
    repo.listar_paginado.return_value = PagedResult([time], 1, 10, 1)
    resposta = await service.listar(atual, 1, 10, setor_id)
    repo.listar_paginado.assert_awaited_once_with(
        atual.unidade_id, 1, 10, setor_id, None, None
    )
    assert resposta.items[0].id == time.id
    assert resposta.total_count == 1
    uow.commit.assert_not_awaited()


async def test_adicionar_membro_valido_persiste_associacao_na_unidade(contexto):
    service, repo, _, membros, usuarios, uow, atual, time = contexto
    usuario_id = uuid4()
    resposta = await service.adicionar_membro(
        atual, time.id, AdicionarMembroRequest(usuario_id=usuario_id)
    )
    repo.obter_por_id.assert_awaited_once_with(atual.unidade_id, time.id)
    usuarios.obter_por_id.assert_awaited_once_with(atual.unidade_id, usuario_id)
    assert resposta.unidade_id == atual.unidade_id
    assert resposta.time_id == time.id
    membros.adicionar.assert_awaited_once()
    uow.commit.assert_awaited_once_with()


@pytest.mark.parametrize("recurso", ["time", "usuario", "duplicado"])
async def test_adicionar_membro_referencia_invalida_ou_duplicada_falha(contexto, recurso):
    service, repo, _, membros, usuarios, uow, atual, time = contexto
    if recurso == "time":
        repo.obter_por_id.return_value = None
    elif recurso == "usuario":
        usuarios.obter_por_id.return_value = None
    else:
        membros.obter_por_time_e_usuario.return_value = TimeMembro(
            atual.unidade_id, time.id, uuid4()
        )
    erro = ConflictException if recurso == "duplicado" else NotFoundException
    with pytest.raises(erro):
        await service.adicionar_membro(atual, time.id, AdicionarMembroRequest(usuario_id=uuid4()))
    membros.adicionar.assert_not_awaited()
    uow.commit.assert_not_awaited()


async def test_adicionar_membro_time_de_terceiro_falha_sem_commit(contexto):
    service, _, _, membros, _, uow, atual, time = contexto
    gerente_alheio = UsuarioAutenticado(uuid4(), atual.unidade_id, "USUARIO_PADRAO")
    with pytest.raises(ForbiddenException):
        await service.adicionar_membro(
            gerente_alheio, time.id, AdicionarMembroRequest(usuario_id=uuid4())
        )
    membros.adicionar.assert_not_awaited()
    uow.commit.assert_not_awaited()
