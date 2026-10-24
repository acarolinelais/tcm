from datetime import datetime
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from src.application.schemas.usuario import AtualizarUsuarioRequest, CriarUsuarioRequest
from src.application.services.usuario_service import UsuarioServiceImpl
from src.domain.common.exceptions import ConflictException, ForbiddenException, NotFoundException
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.usuario import Usuario


@pytest.fixture
def repo():
    return AsyncMock(
        existe_email=AsyncMock(return_value=False),
        existe_user_id=AsyncMock(return_value=False),
    )


@pytest.fixture
def uow():
    return AsyncMock()


@pytest.fixture
def service(repo, uow):
    repo.obter_perfil_padrao.return_value = uuid4()
    return UsuarioServiceImpl(repo, uow, "senha-inicial", lambda senha: f"hash:{senha}")


@pytest.fixture
def usuario_atual():
    return UsuarioAutenticado(id=uuid4(), unidade_id=uuid4(), perfil_codigo="ADMIN_UNIDADE")


@pytest.fixture
def gerente_atual():
    return UsuarioAutenticado(
        id=uuid4(),
        unidade_id=uuid4(),
        perfil_codigo="GERENTE",
        permissoes=frozenset(
            {"usuarios.consultar", "usuarios.perfil.consultar", "usuarios.gerenciar"}
        ),
    )


async def test_criar_usuario_valido_chama_adicionar_e_commit(service, repo, uow, usuario_atual):
    request = CriarUsuarioRequest(nome="Ana", email="ana@example.com")

    resposta = await service.criar(usuario_atual, request)

    repo.adicionar.assert_called_once()
    uow.commit.assert_called_once()
    assert resposta.nome == "Ana"
    assert resposta.email == "ana@example.com"
    assert resposta.user_id is None


async def test_criar_usuario_salva_user_id_normalizado(service, repo, uow, usuario_atual):
    request = CriarUsuarioRequest(
        nome="Ana", email="ana@example.com", user_id="  USR-001  "
    )

    resposta = await service.criar(usuario_atual, request)

    criado = repo.adicionar.await_args.args[0]
    assert criado.user_id == "USR-001"
    assert resposta.user_id == "USR-001"
    repo.existe_user_id.assert_awaited_once_with(usuario_atual.unidade_id, "USR-001", None)
    uow.commit.assert_awaited_once()


async def test_atualizar_usuario_valido_retorna_response_atualizado(
    service, repo, uow, usuario_atual
):
    usuario = Usuario(usuario_atual.unidade_id, "Ana", "ana@example.com")
    usuario.perfil_id = uuid4()
    usuario.created_at = datetime.now()  # simula entidade já persistida, vinda do repositório
    repo.obter_por_id.return_value = usuario
    request = AtualizarUsuarioRequest(nome="Ana Paula", email="ana@example.com")

    resposta = await service.atualizar(usuario_atual, usuario.id, request)

    assert resposta.nome == "Ana Paula"
    assert resposta.user_id is None
    repo.atualizar.assert_called_once_with(usuario)
    uow.commit.assert_called_once()


async def test_atualizar_usuario_define_user_id_e_recusa_duplicidade(
    service, repo, uow, usuario_atual
):
    usuario = Usuario(usuario_atual.unidade_id, "Ana", "ana@example.com")
    usuario.perfil_id = uuid4()
    repo.obter_por_id.return_value = usuario
    repo.existe_user_id.return_value = True

    with pytest.raises(ConflictException):
        await service.atualizar(
            usuario_atual,
            usuario.id,
            AtualizarUsuarioRequest(
                nome="Ana", email="ana@example.com", user_id="USR-001"
            ),
        )

    repo.atualizar.assert_not_awaited()
    uow.commit.assert_not_awaited()


async def test_criar_email_duplicado_levanta_conflict_falha(service, repo, uow, usuario_atual):
    repo.existe_email.return_value = True
    request = CriarUsuarioRequest(nome="Ana", email="ana@example.com")

    with pytest.raises(ConflictException):
        await service.criar(usuario_atual, request)

    repo.adicionar.assert_not_called()
    uow.commit.assert_not_called()


async def test_obter_usuario_inexistente_levanta_notfound_falha(service, repo, usuario_atual):
    repo.obter_por_id.return_value = None

    with pytest.raises(NotFoundException):
        await service.obter(usuario_atual, uuid4())


async def test_inativar_usuario_inexistente_levanta_notfound_falha(
    service, repo, uow, usuario_atual
):
    repo.obter_por_id.return_value = None

    with pytest.raises(NotFoundException):
        await service.inativar(usuario_atual, uuid4())

    uow.commit.assert_not_called()


async def test_gerente_cria_usuario_kp_vinculado_a_si_mesmo(service, repo, uow, gerente_atual):
    perfil_kp = uuid4()
    repo.perfil_kp_atribuivel.return_value = True

    response = await service.criar(
        gerente_atual,
        CriarUsuarioRequest(nome="Carol", email="carol@example.com", perfil_id=perfil_kp),
    )

    criado = repo.adicionar.await_args.args[0]
    assert criado.perfil_id == perfil_kp
    assert criado.responsavel_id == gerente_atual.id
    assert criado.senha_hash == "hash:senha-inicial"
    assert response.perfil_id == perfil_kp
    assert response.responsavel_id == gerente_atual.id
    repo.perfil_atribuivel.assert_not_awaited()
    uow.commit.assert_awaited_once()


async def test_admin_cria_usuario_com_perfil_da_unidade(service, repo, uow, usuario_atual):
    perfil_id = uuid4()
    repo.perfil_atribuivel.return_value = True

    response = await service.criar(
        usuario_atual,
        CriarUsuarioRequest(nome="Carol", email="carol@example.com", perfil_id=perfil_id),
    )

    criado = repo.adicionar.await_args.args[0]
    assert criado.perfil_id == perfil_id
    assert response.perfil_id == perfil_id
    repo.perfil_atribuivel.assert_awaited_once_with(usuario_atual.unidade_id, perfil_id)
    uow.commit.assert_awaited_once()


async def test_admin_nao_cria_usuario_com_perfil_de_outra_unidade_falha(
    service, repo, uow, usuario_atual
):
    repo.perfil_atribuivel.return_value = False

    with pytest.raises(NotFoundException):
        await service.criar(
            usuario_atual,
            CriarUsuarioRequest(nome="Carol", email="carol@example.com", perfil_id=uuid4()),
        )

    repo.adicionar.assert_not_awaited()
    uow.commit.assert_not_awaited()


async def test_gerente_nao_cria_usuario_com_perfil_fora_de_kp_ou_padrao_falha(
    service, repo, uow, gerente_atual
):
    repo.perfil_kp_atribuivel.return_value = False

    with pytest.raises(ForbiddenException):
        await service.criar(
            gerente_atual,
            CriarUsuarioRequest(nome="Carol", email="carol@example.com", perfil_id=uuid4()),
        )

    repo.adicionar.assert_not_awaited()
    uow.commit.assert_not_called()


async def test_gerente_edita_usuario_sob_sua_responsabilidade(service, repo, uow, gerente_atual):
    carol = Usuario(gerente_atual.unidade_id, "Carol", "carol@example.com")
    carol.perfil_id = uuid4()
    carol.created_at = datetime.now()
    carol.responsavel_id = gerente_atual.id
    repo.obter_por_id.return_value = carol
    repo.pertence_a_responsabilidade.return_value = True

    response = await service.atualizar(
        gerente_atual,
        carol.id,
        AtualizarUsuarioRequest(nome="Carol Silva", email="carol@example.com"),
    )

    assert response.nome == "Carol Silva"
    repo.atualizar.assert_awaited_once_with(carol)
    uow.commit.assert_awaited_once()


async def test_gerente_consulta_usuario_sob_sua_responsabilidade(service, repo, gerente_atual):
    carol = Usuario(gerente_atual.unidade_id, "Carol", "carol@example.com")
    carol.perfil_id = uuid4()
    carol.created_at = datetime.now()
    carol.responsavel_id = gerente_atual.id
    repo.pertence_a_escopo.return_value = False
    repo.pertence_a_responsabilidade.return_value = True
    repo.obter_por_id.return_value = carol

    response = await service.obter(gerente_atual, carol.id)

    assert response.id == carol.id
    repo.pertence_a_responsabilidade.assert_awaited_once_with(
        gerente_atual.unidade_id, carol.id, gerente_atual.id
    )


async def test_gerente_inativa_usuario_sob_sua_responsabilidade(service, repo, uow, gerente_atual):
    carol = Usuario(gerente_atual.unidade_id, "Carol", "carol@example.com")
    carol.responsavel_id = gerente_atual.id
    repo.obter_por_id.return_value = carol
    repo.pertence_a_responsabilidade.return_value = True

    await service.inativar(gerente_atual, carol.id)

    assert carol.ativo is False
    repo.atualizar.assert_awaited_once_with(carol)
    uow.commit.assert_awaited_once()


async def test_gerente_nao_edita_usuario_de_outro_responsavel(service, repo, uow, gerente_atual):
    carol = Usuario(gerente_atual.unidade_id, "Carol", "carol@example.com")
    repo.obter_por_id.return_value = carol
    repo.pertence_a_responsabilidade.return_value = False

    with pytest.raises(NotFoundException):
        await service.atualizar(
            gerente_atual,
            carol.id,
            AtualizarUsuarioRequest(nome="Carol Silva", email="carol@example.com"),
        )

    repo.atualizar.assert_not_awaited()
    uow.commit.assert_not_awaited()


async def test_admin_transfere_responsabilidade_para_gerente_ativo(
    service, repo, uow, usuario_atual
):
    carol = Usuario(usuario_atual.unidade_id, "Carol", "carol@example.com")
    carol.perfil_id = uuid4()
    carol.created_at = datetime.now()
    novo_gerente_id = uuid4()
    repo.obter_por_id.return_value = carol
    repo.responsavel_gerente_valido.return_value = True

    response = await service.atribuir_responsavel(usuario_atual, carol.id, novo_gerente_id)

    assert response.responsavel_id == novo_gerente_id
    repo.atualizar.assert_awaited_once_with(carol)
    uow.commit.assert_awaited_once()


async def test_admin_nao_transfere_para_gerente_inativo_ou_de_outra_unidade(
    service, repo, uow, usuario_atual
):
    carol = Usuario(usuario_atual.unidade_id, "Carol", "carol@example.com")
    repo.obter_por_id.return_value = carol
    repo.responsavel_gerente_valido.return_value = False

    with pytest.raises(NotFoundException):
        await service.atribuir_responsavel(usuario_atual, carol.id, uuid4())

    repo.atualizar.assert_not_awaited()
    uow.commit.assert_not_awaited()


async def test_usuario_sem_permissao_nao_consulta_listagem(service, repo):
    usuario = UsuarioAutenticado(uuid4(), uuid4(), perfil_codigo="USUARIO_PADRAO")

    with pytest.raises(ForbiddenException):
        await service.listar(usuario, 1, 10)

    repo.listar_visiveis.assert_not_awaited()
    repo.listar_visiveis_filtrado.assert_not_awaited()


async def test_gerente_recebe_nome_do_perfil_dos_usuarios_no_escopo(service, repo, gerente_atual):
    usuario = Usuario(gerente_atual.unidade_id, "Carol", "carol@example.com")
    usuario.perfil_id = uuid4()
    usuario.created_at = datetime.now()
    repo.listar_visiveis.return_value = PagedResult([usuario], 1, 20, 1)
    repo.dados_por_usuarios.return_value = {
        usuario.id: (usuario.nome, None, "Auditoria", None),
    }

    resposta = await service.listar(gerente_atual, 1, 20)

    assert resposta.items[0].perfil_nome == "Auditoria"
    assert resposta.items[0].perfil_codigo is None
    repo.dados_por_usuarios.assert_awaited_once_with(gerente_atual.unidade_id, (usuario.id,))


async def test_listagem_vazia_nao_busca_metadados_de_perfil(service, repo, gerente_atual):
    repo.listar_visiveis.return_value = PagedResult([], 1, 20, 0)

    resposta = await service.listar(gerente_atual, 1, 20)

    assert resposta.items == []
    repo.dados_por_usuarios.assert_not_awaited()


async def test_gerente_sem_permissao_de_consultar_perfil_nao_recebe_metadados(
    service, repo, gerente_atual
):
    usuario = Usuario(gerente_atual.unidade_id, "Carol", "carol@example.com")
    usuario.perfil_id = uuid4()
    usuario.created_at = datetime.now()
    repo.listar_visiveis.return_value = PagedResult([usuario], 1, 20, 1)
    gerente_sem_permissao = UsuarioAutenticado(
        gerente_atual.id,
        gerente_atual.unidade_id,
        perfil_codigo="GERENTE",
        permissoes=frozenset({"usuarios.consultar", "usuarios.gerenciar"}),
    )

    resposta = await service.listar(gerente_sem_permissao, 1, 20)

    assert resposta.items[0].perfil_nome is None
    assert resposta.items[0].perfil_codigo is None
    repo.dados_por_usuarios.assert_not_awaited()
