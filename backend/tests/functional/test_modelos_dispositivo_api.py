from datetime import datetime
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from src.api.dependencies import get_modelo_dispositivo_service, get_usuario_atual
from src.application.schemas.modelo_dispositivo import ModeloDispositivoResponse
from src.application.services.modelo_dispositivo_service import ModeloDispositivoServiceImpl
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.modelo_dispositivo import ModeloDispositivo
from tests.functional.conftest import dependency_override

AGORA = datetime(2026, 10, 25, 12, 0)


def _resposta(unidade_id, nome="S27 Ultra", modelo_id=None) -> ModeloDispositivoResponse:
    return ModeloDispositivoResponse(
        id=modelo_id or uuid4(),
        unidade_id=unidade_id,
        nome=nome,
        descricao=None,
        ativo=True,
        created_at=AGORA,
        updated_at=AGORA,
    )


def _kp(unidade_id=None) -> UsuarioAutenticado:
    return UsuarioAutenticado(
        uuid4(),
        unidade_id or uuid4(),
        "KP",
        permissoes=frozenset({"projetos.gerenciar", "modelos_dispositivo.gerenciar"}),
    )


def _gerente() -> UsuarioAutenticado:
    return UsuarioAutenticado(
        uuid4(), uuid4(), "GERENTE", permissoes=frozenset({"projetos.gerenciar"})
    )


def _dev() -> UsuarioAutenticado:
    return UsuarioAutenticado(
        uuid4(), uuid4(), "USUARIO_PADRAO", permissoes=frozenset({"projetos.consultar"})
    )


@pytest.fixture
def repo():
    repo = AsyncMock()
    repo.existe_nome.return_value = False
    return repo


def _usar_service_real(usuario: UsuarioAutenticado, repo) -> None:
    from src.api.main import app

    service = ModeloDispositivoServiceImpl(repo, AsyncMock())
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_modelo_dispositivo_service] = dependency_override(service)


async def test_criar_modelo_retorna_201_e_location(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    service = AsyncMock()
    service.criar.return_value = _resposta(usuario.unidade_id)
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_modelo_dispositivo_service] = dependency_override(service)

    response = await api_client.post("/api/modelos-dispositivo", json={"nome": "S27 Ultra"})

    assert response.status_code == 201
    assert response.headers["location"] == f"/api/modelos-dispositivo/{response.json()['id']}"


async def test_listar_modelos_retorna_resultado_paginado(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    service = AsyncMock()
    service.listar.return_value = PagedResult([], 1, 10, 0)
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_modelo_dispositivo_service] = dependency_override(service)

    response = await api_client.get("/api/modelos-dispositivo?page=1&page_size=10&ativo=true")

    assert response.status_code == 200
    assert response.json()["total_count"] == 0
    service.listar.assert_awaited_once_with(usuario, 1, 10, True, None)


async def test_atualizar_modelo_repassa_campos(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    modelo_id = uuid4()
    service = AsyncMock()
    service.atualizar.return_value = _resposta(usuario.unidade_id, "S26 Ultra", modelo_id)
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_modelo_dispositivo_service] = dependency_override(service)

    response = await api_client.patch(
        f"/api/modelos-dispositivo/{modelo_id}", json={"nome": "S26 Ultra"}
    )

    assert response.status_code == 200
    assert response.json()["nome"] == "S26 Ultra"
    service.atualizar.assert_awaited_once()


async def test_kp_cria_modelo_com_descricao_e_datas(api_client, repo):
    usuario = _kp()
    _usar_service_real(usuario, repo)

    response = await api_client.post(
        "/api/modelos-dispositivo", json={"nome": " S27 Ultra ", "descricao": "Flagship"}
    )

    assert response.status_code == 201
    body = response.json()
    assert (body["nome"], body["descricao"], body["ativo"]) == ("S27 Ultra", "Flagship", True)
    assert body["created_at"] is not None
    assert body["updated_at"] == body["created_at"]


async def test_kp_cria_modelo_so_com_nome(api_client, repo):
    _usar_service_real(_kp(), repo)

    response = await api_client.post("/api/modelos-dispositivo", json={"nome": "S27 Ultra"})

    assert response.status_code == 201
    assert response.json()["descricao"] is None


async def test_put_altera_nome_e_descricao(api_client, repo):
    usuario = _kp()
    modelo = ModeloDispositivo(usuario.unidade_id, "S26 Ultra", "Antigo")
    modelo.created_at = modelo.updated_at = AGORA
    repo.obter_por_id.return_value = modelo
    _usar_service_real(usuario, repo)

    response = await api_client.put(
        f"/api/modelos-dispositivo/{modelo.id}",
        json={"nome": "S27 Ultra", "descricao": "Flagship"},
    )

    assert response.status_code == 200
    body = response.json()
    assert (body["nome"], body["descricao"]) == ("S27 Ultra", "Flagship")
    assert body["created_at"] == AGORA.isoformat()
    assert body["updated_at"] != body["created_at"]


@pytest.mark.parametrize("acao,ativo", [("inativar", False), ("ativar", True)])
async def test_kp_inativa_e_reativa_modelo(api_client, repo, acao, ativo):
    usuario = _kp()
    modelo = ModeloDispositivo(usuario.unidade_id, "S27 Ultra")
    modelo.ativo = not ativo
    repo.obter_por_id.return_value = modelo
    _usar_service_real(usuario, repo)

    response = await api_client.patch(f"/api/modelos-dispositivo/{modelo.id}/{acao}")

    assert response.status_code == 200
    assert response.json()["ativo"] is ativo


async def test_admin_sem_permissao_explicita_nao_gerencia_modelo(api_client, repo):
    _usar_service_real(UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE"), repo)

    response = await api_client.post("/api/modelos-dispositivo", json={"nome": "S27 Ultra"})

    assert response.status_code == 403
    repo.adicionar.assert_not_awaited()
    repo.existe_nome.assert_not_awaited()


@pytest.mark.parametrize("metodo", ["post", "put"])
async def test_nome_duplicado_com_espacos_retorna_409(api_client, repo, metodo):
    usuario = _kp()
    repo.existe_nome.return_value = True
    repo.obter_por_id.return_value = ModeloDispositivo(usuario.unidade_id, "S26 Ultra")
    _usar_service_real(usuario, repo)
    url = "/api/modelos-dispositivo" + ("" if metodo == "post" else f"/{uuid4()}")

    response = await getattr(api_client, metodo)(url, json={"nome": " Galaxy S25 "})

    assert response.status_code == 409
    assert repo.existe_nome.call_args.args[1] == "Galaxy S25"


@pytest.mark.parametrize(
    "payload",
    [
        {"nome": "   "},
        {"nome": "x" * (ModeloDispositivo.NOME_MAX_LENGTH + 1)},
        {"nome": "S27 Ultra", "descricao": "x" * (ModeloDispositivo.DESCRICAO_MAX_LENGTH + 1)},
    ],
)
async def test_campos_invalidos_retornam_422(api_client, repo, payload):
    _usar_service_real(_kp(), repo)

    response = await api_client.post("/api/modelos-dispositivo", json=payload)

    assert response.status_code == 422
    repo.adicionar.assert_not_awaited()


@pytest.mark.parametrize("usuario", [_gerente(), _dev()], ids=["gerente", "dev"])
async def test_gerente_e_dev_recebem_403_no_catalogo(api_client, repo, usuario):
    _usar_service_real(usuario, repo)
    modelo_id = uuid4()

    respostas = [
        await api_client.get("/api/modelos-dispositivo"),
        await api_client.post("/api/modelos-dispositivo", json={"nome": "S27 Ultra"}),
        await api_client.put(f"/api/modelos-dispositivo/{modelo_id}", json={"nome": "S27"}),
        await api_client.patch(f"/api/modelos-dispositivo/{modelo_id}/inativar"),
        await api_client.patch(f"/api/modelos-dispositivo/{modelo_id}/ativar"),
    ]

    assert [r.status_code for r in respostas] == [403] * 5
    repo.adicionar.assert_not_awaited()
    repo.atualizar.assert_not_awaited()


async def test_modelo_de_outra_unidade_retorna_404(api_client, repo):
    repo.obter_por_id.return_value = None
    usuario = _kp()
    _usar_service_real(usuario, repo)
    modelo_id = uuid4()

    response = await api_client.put(f"/api/modelos-dispositivo/{modelo_id}", json={"nome": "S27"})

    assert response.status_code == 404
    repo.obter_por_id.assert_awaited_once_with(usuario.unidade_id, modelo_id)


async def test_gerente_lista_opcoes_ativas(api_client, repo):
    usuario = _gerente()
    modelo = ModeloDispositivo(usuario.unidade_id, "S27 Ultra", "Flagship")
    repo.listar_paginado.return_value = PagedResult([modelo], 1, 100, 1)
    _usar_service_real(usuario, repo)

    response = await api_client.get("/api/modelos-dispositivo/opcoes?page_size=100")

    assert response.status_code == 200
    assert response.json()["items"] == [
        {"id": str(modelo.id), "nome": "S27 Ultra", "descricao": "Flagship"}
    ]
    repo.listar_paginado.assert_awaited_once_with(usuario.unidade_id, 1, 100, True, None)


async def test_dev_recebe_403_nas_opcoes(api_client, repo):
    _usar_service_real(_dev(), repo)

    response = await api_client.get("/api/modelos-dispositivo/opcoes")

    assert response.status_code == 403


async def test_opcao_sem_descricao_vem_com_descricao_nula(api_client, repo):
    usuario = _gerente()
    repo.listar_paginado.return_value = PagedResult(
        [ModeloDispositivo(usuario.unidade_id, "Tab S11")], 1, 100, 1
    )
    _usar_service_real(usuario, repo)

    response = await api_client.get("/api/modelos-dispositivo/opcoes")

    assert response.status_code == 200
    assert response.json()["items"][0]["descricao"] is None
