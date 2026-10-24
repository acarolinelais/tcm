from datetime import datetime
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from src.api.dependencies import get_usuario_atual, get_usuario_service
from src.application.schemas.usuario import UsuarioResponse
from src.domain.common.exceptions import ConflictException, ForbiddenException
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from tests.functional.conftest import dependency_override


@pytest.mark.asyncio
@pytest.mark.parametrize("perfil_codigo", ["ADMIN_UNIDADE", "GERENTE"])
async def test_criar_usuario_encaminha_perfil_selecionado(api_client, perfil_codigo):
    from src.api.main import app

    unidade_id, perfil_id = uuid4(), uuid4()
    permissoes = frozenset({"usuarios.gerenciar"}) if perfil_codigo == "GERENTE" else frozenset()
    atual = UsuarioAutenticado(
        uuid4(), unidade_id, perfil_codigo=perfil_codigo, permissoes=permissoes
    )
    usuario_id = uuid4()
    service = AsyncMock()
    service.criar.return_value = UsuarioResponse(
        id=usuario_id,
        nome="Carol",
        email="carol@example.com",
        user_id="USR-001",
        ativo=True,
        perfil_id=perfil_id,
        responsavel_id=atual.id if perfil_codigo == "GERENTE" else None,
        created_at=datetime.now(),
    )
    app.dependency_overrides[get_usuario_atual] = dependency_override(atual)
    app.dependency_overrides[get_usuario_service] = dependency_override(service)

    response = await api_client.post(
        "/api/usuarios",
        json={
            "nome": "Carol",
            "email": "carol@example.com",
            "user_id": "USR-001",
            "perfil_id": str(perfil_id),
        },
    )

    assert response.status_code == 201
    assert response.headers["location"] == f"/api/usuarios/{usuario_id}"
    assert response.json()["perfil_id"] == str(perfil_id)
    assert response.json()["user_id"] == "USR-001"
    assert response.json()["responsavel_id"] == (
        str(atual.id) if perfil_codigo == "GERENTE" else None
    )
    service.criar.assert_awaited_once()
    assert service.criar.await_args.args[0] == atual
    assert service.criar.await_args.args[1].perfil_id == perfil_id
    assert service.criar.await_args.args[1].user_id == "USR-001"


@pytest.mark.asyncio
async def test_criar_usuario_com_user_id_duplicado_retorna_409(api_client):
    from src.api.main import app

    atual = UsuarioAutenticado(uuid4(), uuid4(), perfil_codigo="ADMIN_UNIDADE")
    service = AsyncMock()
    service.criar.side_effect = ConflictException(
        "Já existe um usuário com este User ID nesta unidade."
    )
    app.dependency_overrides[get_usuario_atual] = dependency_override(atual)
    app.dependency_overrides[get_usuario_service] = dependency_override(service)

    response = await api_client.post(
        "/api/usuarios",
        json={"nome": "Carol", "email": "carol@example.com", "user_id": "USR-001"},
    )

    assert response.status_code == 409
    service.criar.assert_awaited_once()


@pytest.mark.asyncio
async def test_criar_usuario_com_user_id_acima_do_limite_retorna_422(api_client):
    from src.api.main import app

    atual = UsuarioAutenticado(uuid4(), uuid4(), perfil_codigo="ADMIN_UNIDADE")
    service = AsyncMock()
    app.dependency_overrides[get_usuario_atual] = dependency_override(atual)
    app.dependency_overrides[get_usuario_service] = dependency_override(service)

    response = await api_client.post(
        "/api/usuarios",
        json={"nome": "Carol", "email": "carol@example.com", "user_id": "x" * 151},
    )

    assert response.status_code == 422
    service.criar.assert_not_awaited()


@pytest.mark.asyncio
async def test_criar_usuario_com_perfil_nao_permitido_retorna_403(api_client):
    from src.api.main import app

    gerente = UsuarioAutenticado(
        uuid4(),
        uuid4(),
        perfil_codigo="GERENTE",
        permissoes=frozenset({"usuarios.gerenciar"}),
    )
    service = AsyncMock()
    service.criar.side_effect = ForbiddenException(
        "Gerentes podem atribuir somente o perfil KP ou padrão."
    )
    app.dependency_overrides[get_usuario_atual] = dependency_override(gerente)
    app.dependency_overrides[get_usuario_service] = dependency_override(service)

    response = await api_client.post(
        "/api/usuarios",
        json={"nome": "Carol", "email": "carol@example.com", "perfil_id": str(uuid4())},
    )

    assert response.status_code == 403
    assert "location" not in response.headers


@pytest.mark.asyncio
async def test_gerente_consulta_perfil_atual_dos_usuarios_listados(api_client):
    from src.api.main import app

    gerente = UsuarioAutenticado(
        uuid4(),
        uuid4(),
        perfil_codigo="GERENTE",
        permissoes=frozenset({"usuarios.consultar", "usuarios.perfil.consultar"}),
    )
    usuario_id, perfil_id = uuid4(), uuid4()
    service = AsyncMock()
    service.listar.return_value = PagedResult(
        [
            UsuarioResponse(
                id=usuario_id,
                nome="Carol",
                email="carol@example.com",
                ativo=True,
                perfil_id=perfil_id,
                perfil_nome="Auditoria",
                perfil_codigo="AUDITORIA",
                responsavel_id=gerente.id,
                created_at=datetime.now(),
            )
        ],
        1,
        20,
        1,
    )
    app.dependency_overrides[get_usuario_atual] = dependency_override(gerente)
    app.dependency_overrides[get_usuario_service] = dependency_override(service)

    response = await api_client.get("/api/usuarios")

    assert response.status_code == 200
    assert response.json()["items"][0]["perfil_nome"] == "Auditoria"
    assert response.json()["items"][0]["perfil_codigo"] == "AUDITORIA"
    service.listar.assert_awaited_once()
