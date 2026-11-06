from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from pydantic import ValidationError
from src.application.schemas.modelo_dispositivo import (
    AtualizarModeloDispositivoRequest,
    CriarModeloDispositivoRequest,
)
from src.application.services.modelo_dispositivo_service import ModeloDispositivoServiceImpl
from src.domain.common.exceptions import ConflictException, ForbiddenException, NotFoundException
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.modelo_dispositivo import ModeloDispositivo


@pytest.fixture
def contexto():
    repo, uow = AsyncMock(), AsyncMock()
    repo.existe_nome.return_value = False
    usuario = UsuarioAutenticado(
        uuid4(),
        uuid4(),
        "GERENTE",
        permissoes=frozenset({"projetos.consultar", "projetos.gerenciar"}),
    )
    return ModeloDispositivoServiceImpl(repo, uow), repo, uow, usuario


async def test_criar_modelo_valido_persiste_na_unidade_do_usuario(contexto):
    service, repo, uow, usuario = contexto

    resposta = await service.criar(usuario, CriarModeloDispositivoRequest(nome=" S27 Ultra "))

    modelo = repo.adicionar.call_args.args[0]
    assert resposta.id == modelo.id
    assert resposta.unidade_id == usuario.unidade_id
    assert resposta.nome == "S27 Ultra"
    repo.existe_nome.assert_awaited_once_with(usuario.unidade_id, "S27 Ultra", None)
    repo.adicionar.assert_awaited_once_with(modelo)
    uow.commit.assert_awaited_once_with()


async def test_criar_modelo_duplicado_na_unidade_falha_sem_commit(contexto):
    service, repo, uow, usuario = contexto
    repo.existe_nome.return_value = True

    with pytest.raises(ConflictException):
        await service.criar(usuario, CriarModeloDispositivoRequest(nome="S27 Ultra"))

    repo.adicionar.assert_not_awaited()
    uow.commit.assert_not_awaited()


async def test_criar_modelo_sem_permissao_falha_sem_persistir(contexto):
    service, repo, uow, usuario = contexto
    membro = UsuarioAutenticado(usuario.id, usuario.unidade_id, "USUARIO_PADRAO")

    with pytest.raises(ForbiddenException):
        await service.criar(membro, CriarModeloDispositivoRequest(nome="S27 Ultra"))

    repo.existe_nome.assert_not_awaited()
    repo.adicionar.assert_not_awaited()
    uow.commit.assert_not_awaited()


async def test_atualizar_modelo_renomeia_e_inativa(contexto):
    service, repo, uow, usuario = contexto
    modelo = ModeloDispositivo(usuario.unidade_id, "S26 Ultra")
    repo.obter_por_id.return_value = modelo

    resposta = await service.atualizar(
        usuario,
        modelo.id,
        AtualizarModeloDispositivoRequest(nome="S27 Ultra", ativo=False),
    )

    assert resposta.nome == "S27 Ultra"
    assert resposta.ativo is False
    repo.existe_nome.assert_awaited_once_with(usuario.unidade_id, "S27 Ultra", modelo.id)
    repo.atualizar.assert_awaited_once_with(modelo)
    uow.commit.assert_awaited_once_with()


async def test_atualizar_modelo_inexistente_falha_sem_commit(contexto):
    service, repo, uow, usuario = contexto
    repo.obter_por_id.return_value = None

    with pytest.raises(NotFoundException):
        await service.atualizar(
            usuario, uuid4(), AtualizarModeloDispositivoRequest(nome="S27 Ultra")
        )

    repo.atualizar.assert_not_awaited()
    uow.commit.assert_not_awaited()


async def test_listar_modelos_filtra_unidade_e_mapeia_paginacao(contexto):
    service, repo, _, usuario = contexto
    modelo = ModeloDispositivo(usuario.unidade_id, "S27 Ultra")
    repo.listar_paginado.return_value = PagedResult([modelo], 2, 5, 6)

    resultado = await service.listar(usuario, 2, 5, ativo=True, busca="S27")

    repo.listar_paginado.assert_awaited_once_with(usuario.unidade_id, 2, 5, True, "S27")
    assert resultado.items[0].id == modelo.id
    assert (resultado.page, resultado.page_size, resultado.total_count) == (2, 5, 6)


async def test_atualizar_modelo_sem_campos_falha_na_validacao():
    with pytest.raises(ValidationError):
        AtualizarModeloDispositivoRequest()
