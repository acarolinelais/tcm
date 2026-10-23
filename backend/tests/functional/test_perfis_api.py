from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock
from uuid import uuid4

import pytest
from sqlalchemy.exc import IntegrityError
from src.api.dependencies import get_session, get_usuario_atual
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from tests.functional.conftest import dependency_override


@pytest.mark.asyncio
async def test_catalogo_de_permissoes_inclui_metadados_e_ordem(api_client):
    from src.api.main import app

    unidade_id = uuid4()
    usuario = UsuarioAutenticado(uuid4(), unidade_id, "ADMIN_UNIDADE")
    rows = [
        SimpleNamespace(id="times.gerenciar", descricao="Gerenciar times"),
        SimpleNamespace(id="usuarios.consultar", descricao="Consultar usuários"),
        SimpleNamespace(id="usuarios.gerenciar", descricao="Gerenciar usuários"),
    ]
    resultado = SimpleNamespace(scalars=lambda: SimpleNamespace(all=lambda: rows))
    session = AsyncMock()
    session.execute.return_value = resultado
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_session] = dependency_override(session)

    response = await api_client.get("/api/perfis/permissoes")

    assert response.status_code == 200
    assert [(item["id"], item["ordem"]) for item in response.json()] == [
        ("usuarios.consultar", 1),
        ("usuarios.gerenciar", 2),
        ("times.gerenciar", 3),
    ]
    assert response.json()[0]["modulo"] == {"codigo": "usuarios", "nome": "Usuários", "ordem": 1}


@pytest.mark.asyncio
async def test_catalogo_sem_permissao_retorna_403_sem_consultar_dados(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4())
    session = AsyncMock()
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_session] = dependency_override(session)

    response = await api_client.get("/api/perfis/permissoes")

    assert response.status_code == 403
    session.execute.assert_not_awaited()


@pytest.mark.asyncio
async def test_criar_perfil_sem_permissao_retorna_403_sem_persistir(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4())
    session = AsyncMock()
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_session] = dependency_override(session)

    response = await api_client.post("/api/perfis", json={"nome": "Sem acesso"})

    assert response.status_code == 403
    session.execute.assert_not_awaited()
    session.commit.assert_not_awaited()


@pytest.mark.asyncio
@pytest.mark.parametrize("codigo", ["ADMIN_UNIDADE", "USUARIO_PADRAO", "GERENTE", "KP"])
async def test_admin_altera_permissoes_de_perfil_seedado(api_client, codigo):
    from src.api.main import app

    unidade_id = uuid4()
    usuario = UsuarioAutenticado(uuid4(), unidade_id, "ADMIN_UNIDADE")
    perfil = SimpleNamespace(
        id=uuid4(), unidade_id=unidade_id, codigo=codigo, nome=codigo, descricao=None
    )
    session = AsyncMock()
    session.get.return_value = perfil
    session.add_all = Mock()
    session.execute.return_value = SimpleNamespace(
        scalars=lambda: SimpleNamespace(all=lambda: ["usuarios.consultar"])
    )
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_session] = dependency_override(session)

    response = await api_client.put(
        f"/api/perfis/{perfil.id}/permissoes", json={"permissoes": ["usuarios.consultar"]}
    )

    assert response.status_code == 200
    assert response.json()["codigo"] == codigo
    assert response.json()["permissoes"] == ["usuarios.consultar"]
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_perfil_de_outra_unidade_nao_pode_ser_alterado(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    perfil = SimpleNamespace(id=uuid4(), unidade_id=uuid4(), codigo=None)
    session = AsyncMock()
    session.get.return_value = perfil
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_session] = dependency_override(session)

    response = await api_client.put(
        f"/api/perfis/{perfil.id}/permissoes", json={"permissoes": ["usuarios.consultar"]}
    )

    assert response.status_code == 404
    session.execute.assert_not_awaited()
    session.commit.assert_not_awaited()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("perfil_codigo", "codigo_atribuido"),
    [("ADMIN_UNIDADE", "COORDENACAO"), ("GERENTE", "KP")],
)
async def test_admin_ou_gerente_responsavel_pode_atribuir_perfil_permitido(
    api_client, perfil_codigo, codigo_atribuido
):
    from src.api.main import app

    unidade_id, usuario_id, perfil_kp_id = uuid4(), uuid4(), uuid4()
    atual_id = uuid4()
    permissoes = frozenset({"usuarios.gerenciar"}) if perfil_codigo == "GERENTE" else frozenset()
    atual = UsuarioAutenticado(
        atual_id, unidade_id, perfil_codigo=perfil_codigo, permissoes=permissoes
    )
    usuario = SimpleNamespace(
        id=usuario_id,
        unidade_id=unidade_id,
        perfil_id=uuid4(),
        responsavel_id=atual_id if perfil_codigo == "GERENTE" else None,
        auth_version=4,
    )
    perfil_kp = SimpleNamespace(id=perfil_kp_id, unidade_id=unidade_id, codigo=codigo_atribuido)
    perfil_atual = SimpleNamespace(
        id=usuario.perfil_id, unidade_id=unidade_id, codigo="USUARIO_PADRAO"
    )
    session = AsyncMock()
    session.get.side_effect = [usuario, perfil_kp, perfil_atual]
    app.dependency_overrides[get_usuario_atual] = dependency_override(atual)
    app.dependency_overrides[get_session] = dependency_override(session)

    response = await api_client.patch(
        f"/api/perfis/usuarios/{usuario_id}", json={"perfil_id": str(perfil_kp_id)}
    )

    assert response.status_code == 204
    assert usuario.perfil_id == perfil_kp_id
    assert usuario.auth_version == 5
    session.execute.assert_not_awaited()
    session.add.assert_not_called()
    session.delete.assert_not_awaited()
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_gerente_nao_pode_atribuir_perfil_alem_de_kp_ou_padrao(api_client):
    from src.api.main import app

    unidade_id, usuario_id = uuid4(), uuid4()
    gerente_id = uuid4()
    gerente = UsuarioAutenticado(
        gerente_id,
        unidade_id,
        perfil_codigo="GERENTE",
        permissoes=frozenset({"usuarios.gerenciar"}),
    )
    usuario = SimpleNamespace(
        id=usuario_id,
        unidade_id=unidade_id,
        perfil_id=uuid4(),
        responsavel_id=gerente_id,
        auth_version=1,
    )
    perfil = SimpleNamespace(id=uuid4(), unidade_id=unidade_id, codigo="DESENVOLVEDOR")
    session = AsyncMock()
    session.get.side_effect = [usuario, perfil]
    app.dependency_overrides[get_usuario_atual] = dependency_override(gerente)
    app.dependency_overrides[get_session] = dependency_override(session)

    response = await api_client.patch(
        f"/api/perfis/usuarios/{usuario_id}", json={"perfil_id": str(perfil.id)}
    )

    assert response.status_code == 403
    assert usuario.auth_version == 1
    session.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_gerente_nao_altera_perfil_de_usuario_fora_da_responsabilidade(api_client):
    from src.api.main import app

    unidade_id = uuid4()
    gerente = UsuarioAutenticado(
        uuid4(),
        unidade_id,
        perfil_codigo="GERENTE",
        permissoes=frozenset({"usuarios.gerenciar"}),
    )
    usuario = SimpleNamespace(
        id=uuid4(), unidade_id=unidade_id, responsavel_id=uuid4(), auth_version=1
    )
    session = AsyncMock()
    session.get.return_value = usuario
    app.dependency_overrides[get_usuario_atual] = dependency_override(gerente)
    app.dependency_overrides[get_session] = dependency_override(session)

    response = await api_client.patch(
        f"/api/perfis/usuarios/{usuario.id}", json={"perfil_id": str(uuid4())}
    )

    assert response.status_code == 404
    session.get.assert_awaited_once()
    session.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_perfil_de_outra_unidade_nao_pode_ser_atribuido(api_client):
    from src.api.main import app

    unidade_id, usuario_id = uuid4(), uuid4()
    admin = UsuarioAutenticado(uuid4(), unidade_id, "ADMIN_UNIDADE")
    usuario = SimpleNamespace(
        id=usuario_id, unidade_id=unidade_id, perfil_id=uuid4(), auth_version=1
    )
    perfil = SimpleNamespace(id=uuid4(), unidade_id=uuid4(), codigo="KP")
    session = AsyncMock()
    session.get.side_effect = [usuario, perfil]
    app.dependency_overrides[get_usuario_atual] = dependency_override(admin)
    app.dependency_overrides[get_session] = dependency_override(session)

    response = await api_client.patch(
        f"/api/perfis/usuarios/{usuario_id}", json={"perfil_id": str(perfil.id)}
    )

    assert response.status_code == 404
    assert usuario.auth_version == 1
    session.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_listar_perfis_escopa_consulta_a_unidade_autenticada(api_client):
    from src.api.main import app

    unidade_id = uuid4()
    usuario = UsuarioAutenticado(uuid4(), unidade_id, "ADMIN_UNIDADE")
    perfil = SimpleNamespace(
        id=uuid4(), unidade_id=unidade_id, nome="Perfil local", descricao=None, codigo=None
    )
    session = AsyncMock()
    session.execute.side_effect = [
        SimpleNamespace(scalars=lambda: SimpleNamespace(all=lambda: [perfil])),
        SimpleNamespace(scalars=lambda: SimpleNamespace(all=lambda: ["usuarios.consultar"])),
    ]
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_session] = dependency_override(session)

    response = await api_client.get("/api/perfis")

    assert response.status_code == 200
    assert [item["nome"] for item in response.json()] == ["Perfil local"]
    statement = session.execute.await_args_list[0].args[0]
    assert "perfis.unidade_id" in str(statement)
    assert unidade_id in statement.compile().params.values()


@pytest.mark.asyncio
async def test_criar_perfil_persiste_permissoes_no_mesmo_envio(api_client):
    from src.api.main import app

    unidade_id = uuid4()
    usuario = UsuarioAutenticado(uuid4(), unidade_id, "ADMIN_UNIDADE")
    sem_conflito = SimpleNamespace(first=lambda: None)
    permissoes_encontradas = SimpleNamespace(
        scalars=lambda: SimpleNamespace(all=lambda: ["usuarios.consultar", "times.criar"])
    )
    session = AsyncMock()
    session.execute.side_effect = [sem_conflito, permissoes_encontradas]
    session.add = Mock()
    session.add_all = Mock()
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_session] = dependency_override(session)

    response = await api_client.post(
        "/api/perfis",
        json={
            "nome": "Coordenação",
            "descricao": "Acesso de coordenação",
            "permissoes": ["times.criar", "usuarios.consultar"],
        },
    )

    assert response.status_code == 201
    assert response.json()["permissoes"] == ["times.criar", "usuarios.consultar"]
    session.add.assert_called_once()
    associacoes = session.add_all.call_args.args[0]
    assert {associacao.permissao_id for associacao in associacoes} == {
        "usuarios.consultar",
        "times.criar",
    }
    assert {associacao.perfil_id for associacao in associacoes} == {
        session.add.call_args.args[0].id
    }
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_criar_perfil_sem_permissoes_e_valido(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    session = AsyncMock()
    session.execute.return_value = SimpleNamespace(first=lambda: None)
    session.add = Mock()
    session.add_all = Mock()
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_session] = dependency_override(session)

    response = await api_client.post("/api/perfis", json={"nome": "Sem acessos"})

    assert response.status_code == 201
    assert response.json()["permissoes"] == []
    session.add_all.assert_called_once_with([])
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_permissao_invalida_na_criacao_nao_persiste_perfil(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    sem_conflito = SimpleNamespace(first=lambda: None)
    resultado_parcial = SimpleNamespace(
        scalars=lambda: SimpleNamespace(all=lambda: ["usuarios.consultar"])
    )
    session = AsyncMock()
    session.execute.side_effect = [sem_conflito, resultado_parcial]
    session.add = Mock()
    session.add_all = Mock()
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_session] = dependency_override(session)

    response = await api_client.post(
        "/api/perfis",
        json={"nome": "Inválido", "permissoes": ["usuarios.consultar", "nao.existe"]},
    )

    assert response.status_code == 404
    session.add.assert_not_called()
    session.add_all.assert_not_called()
    session.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_conflito_de_nome_na_criacao_nao_persiste_perfil(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    session = AsyncMock()
    session.execute.return_value = SimpleNamespace(first=lambda: (uuid4(),))
    session.add = Mock()
    session.add_all = Mock()
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_session] = dependency_override(session)

    response = await api_client.post("/api/perfis", json={"nome": "Duplicado"})

    assert response.status_code == 409
    session.add.assert_not_called()
    session.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_falha_de_commit_na_criacao_faz_rollback_da_transacao(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    sem_conflito = SimpleNamespace(first=lambda: None)
    permissoes_encontradas = SimpleNamespace(
        scalars=lambda: SimpleNamespace(all=lambda: ["usuarios.consultar"])
    )
    session = AsyncMock()
    session.execute.side_effect = [sem_conflito, permissoes_encontradas]
    session.add = Mock()
    session.add_all = Mock()
    session.commit.side_effect = IntegrityError("insert", {}, Exception("unique"))
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_session] = dependency_override(session)

    response = await api_client.post(
        "/api/perfis", json={"nome": "Duplicado concorrente", "permissoes": ["usuarios.consultar"]}
    )

    assert response.status_code == 409
    session.rollback.assert_awaited_once()
