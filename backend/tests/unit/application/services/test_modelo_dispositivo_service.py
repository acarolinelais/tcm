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
        "KP",
        permissoes=frozenset({"projetos.gerenciar", "modelos_dispositivo.gerenciar"}),
    )
    return ModeloDispositivoServiceImpl(repo, uow), repo, uow, usuario


def _gerente(usuario: UsuarioAutenticado) -> UsuarioAutenticado:
    return UsuarioAutenticado(
        usuario.id,
        usuario.unidade_id,
        "GERENTE",
        permissoes=frozenset({"projetos.consultar", "projetos.gerenciar"}),
    )


async def test_criar_modelo_valido_persiste_na_unidade_do_usuario(contexto):
    service, repo, uow, usuario = contexto

    resposta = await service.criar(
        usuario, CriarModeloDispositivoRequest(nome=" S27 Ultra ", descricao=" Flagship ")
    )

    modelo = repo.adicionar.call_args.args[0]
    assert resposta.id == modelo.id
    assert resposta.unidade_id == usuario.unidade_id
    assert resposta.nome == "S27 Ultra"
    assert resposta.descricao == "Flagship"
    assert resposta.ativo is True
    assert resposta.created_at is not None
    assert resposta.updated_at == resposta.created_at
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


async def test_criar_modelo_so_com_nome_fica_sem_descricao(contexto):
    service, _, _, usuario = contexto

    resposta = await service.criar(usuario, CriarModeloDispositivoRequest(nome="S27 Ultra"))

    assert resposta.descricao is None


async def test_admin_gerencia_modelo_sem_permissao_explicita(contexto):
    service, repo, uow, usuario = contexto
    admin = UsuarioAutenticado(usuario.id, usuario.unidade_id, "ADMIN_UNIDADE")

    await service.criar(admin, CriarModeloDispositivoRequest(nome="S27 Ultra"))

    repo.adicionar.assert_awaited_once()
    uow.commit.assert_awaited_once_with()


@pytest.mark.parametrize(
    "perfil_codigo,permissoes",
    [
        ("GERENTE", {"projetos.consultar", "projetos.gerenciar"}),
        ("USUARIO_PADRAO", {"projetos.consultar", "test_cases.consultar"}),
    ],
)
async def test_gerente_e_dev_nao_acessam_catalogo(contexto, perfil_codigo, permissoes):
    service, repo, uow, usuario = contexto
    outro = UsuarioAutenticado(
        usuario.id, usuario.unidade_id, perfil_codigo, permissoes=frozenset(permissoes)
    )

    with pytest.raises(ForbiddenException):
        await service.listar(outro, 1, 20)
    with pytest.raises(ForbiddenException):
        await service.criar(outro, CriarModeloDispositivoRequest(nome="S27 Ultra"))
    with pytest.raises(ForbiddenException):
        await service.atualizar(outro, uuid4(), AtualizarModeloDispositivoRequest(ativo=False))

    repo.listar_paginado.assert_not_awaited()
    repo.obter_por_id.assert_not_awaited()
    uow.commit.assert_not_awaited()


async def test_gerente_lista_somente_opcoes_ativas(contexto):
    service, repo, _, usuario = contexto
    modelo = ModeloDispositivo(usuario.unidade_id, "S27 Ultra", "Flagship")
    repo.listar_paginado.return_value = PagedResult([modelo], 1, 100, 1)

    resultado = await service.listar_opcoes(_gerente(usuario), 1, 100, busca="S27")

    repo.listar_paginado.assert_awaited_once_with(usuario.unidade_id, 1, 100, True, "S27")
    assert resultado.items[0].model_dump() == {
        "id": modelo.id,
        "nome": "S27 Ultra",
        "descricao": "Flagship",
    }


async def test_dev_nao_lista_opcoes(contexto):
    service, repo, _, usuario = contexto
    dev = UsuarioAutenticado(
        usuario.id,
        usuario.unidade_id,
        "USUARIO_PADRAO",
        permissoes=frozenset({"projetos.consultar"}),
    )

    with pytest.raises(ForbiddenException):
        await service.listar_opcoes(dev, 1, 100)

    repo.listar_paginado.assert_not_awaited()


async def test_atualizar_descricao_nula_limpa_e_ausente_preserva(contexto):
    service, repo, _, usuario = contexto
    modelo = ModeloDispositivo(usuario.unidade_id, "S27 Ultra", "Flagship")
    repo.obter_por_id.return_value = modelo

    preservada = await service.atualizar(
        usuario, modelo.id, AtualizarModeloDispositivoRequest(nome="S27 Ultra 5G")
    )
    assert preservada.descricao == "Flagship"

    limpa = await service.atualizar(
        usuario, modelo.id, AtualizarModeloDispositivoRequest(descricao=None)
    )
    assert limpa.descricao is None
    assert limpa.updated_at is not None


async def test_renomear_para_nome_duplicado_falha_sem_commit(contexto):
    service, repo, uow, usuario = contexto
    repo.obter_por_id.return_value = ModeloDispositivo(usuario.unidade_id, "S26 Ultra")
    repo.existe_nome.return_value = True

    with pytest.raises(ConflictException):
        await service.atualizar(
            usuario, uuid4(), AtualizarModeloDispositivoRequest(nome=" Galaxy S25 ")
        )

    repo.existe_nome.assert_awaited_once()
    assert repo.existe_nome.call_args.args[1] == "Galaxy S25"
    uow.commit.assert_not_awaited()


def test_descricao_acima_do_limite_falha_na_validacao():
    with pytest.raises(ValidationError):
        CriarModeloDispositivoRequest(
            nome="S27 Ultra", descricao="x" * (ModeloDispositivo.DESCRICAO_MAX_LENGTH + 1)
        )
