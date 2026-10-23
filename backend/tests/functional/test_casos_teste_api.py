from unittest.mock import AsyncMock
from uuid import uuid4

from src.api.dependencies import get_caso_teste_service, get_usuario_atual
from src.application.schemas.caso_teste import CasoTesteResponse
from src.application.services.caso_teste_service import CasoTesteServiceImpl
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.caso_teste import CasoTeste, CategoriaCasoTeste, DificuldadeCasoTeste
from src.domain.entities.projeto import Projeto
from src.domain.entities.time import Time
from tests.functional.conftest import dependency_override


def _caso(usuario, projeto_id):
    return CasoTesteResponse(
        id=uuid4(),
        unidade_id=usuario.unidade_id,
        projeto_id=projeto_id,
        tc_id="Clock_001",
        category="A",
        difficulty="Low",
        situation="To-Do",
        responsavel_id=uuid4(),
        backup_id=uuid4(),
        ativo=True,
        created_at=None,
        updated_at=None,
    )


async def test_criar_test_case_retorna_location(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    projeto_id = uuid4()
    service = AsyncMock()
    service.criar.return_value = _caso(usuario, projeto_id)
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_caso_teste_service] = dependency_override(service)

    response = await api_client.post(
        f"/api/projetos/{projeto_id}/test-cases",
        json={
            "tc_id": "Clock_001",
            "category": "A",
            "difficulty": "Low",
            "responsavel_id": str(uuid4()),
            "backup_id": str(uuid4()),
        },
    )

    assert response.status_code == 201
    assert response.headers["location"] == f"/api/test-cases/{response.json()['id']}"


async def test_listar_test_cases_retorna_paginacao(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    projeto_id = uuid4()
    service = AsyncMock()
    service.listar.return_value = PagedResult([], 1, 20, 0)
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_caso_teste_service] = dependency_override(service)

    response = await api_client.get(f"/api/projetos/{projeto_id}/test-cases")

    assert response.status_code == 200
    assert response.json()["page_size"] == 20
    service.listar.assert_awaited_once_with(usuario, projeto_id, 1, 20)


async def test_obter_test_case_retorna_200(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    caso = _caso(usuario, uuid4())
    service = AsyncMock()
    service.obter.return_value = caso
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_caso_teste_service] = dependency_override(service)

    response = await api_client.get(f"/api/test-cases/{caso.id}")

    assert response.status_code == 200
    assert response.json()["tc_id"] == "Clock_001"


async def test_atualizar_test_case_usa_put_e_repassa_payload(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    caso = _caso(usuario, uuid4())
    service = AsyncMock()
    service.atualizar.return_value = caso
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_caso_teste_service] = dependency_override(service)

    response = await api_client.put(f"/api/test-cases/{caso.id}", json={"situation": "InProgress"})

    assert response.status_code == 200
    service.atualizar.assert_awaited_once()


async def test_transferir_test_case_para_backup(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "USUARIO_PADRAO")
    caso = _caso(usuario, uuid4())
    caso = caso.model_copy(update={"responsavel_id": uuid4(), "backup_id": None})
    service = AsyncMock()
    service.transferir_para_backup.return_value = caso
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_caso_teste_service] = dependency_override(service)

    response = await api_client.patch(f"/api/test-cases/{caso.id}/transferir-para-backup")

    assert response.status_code == 200
    assert response.json()["backup_id"] is None


async def test_gerente_nao_consulta_test_case_de_outro_setor(api_client):
    from src.api.main import app

    unidade_id, usuario_id, setor_id, time_id = (uuid4() for _ in range(4))
    gerente = UsuarioAutenticado(
        usuario_id,
        unidade_id,
        "GERENTE",
        permissoes=frozenset({"test_cases.consultar"}),
        setores_gerenciados=(uuid4(),),
    )
    caso_repo, projeto_repo, time_repo, membro_repo, usuario_repo, uow = (
        AsyncMock() for _ in range(6)
    )
    projeto = Projeto(unidade_id, time_id, "Clock", "9.5")
    caso = CasoTeste(
        unidade_id,
        projeto.id,
        "Clock_001",
        CategoriaCasoTeste.A,
        DificuldadeCasoTeste.LOW,
        uuid4(),
        uuid4(),
    )
    caso_repo.obter_por_id.return_value = caso
    projeto_repo.obter_por_id.return_value = projeto
    time_repo.obter_por_id.return_value = Time(unidade_id, setor_id, "Outro setor", usuario_id)
    service = CasoTesteServiceImpl(
        caso_repo, projeto_repo, time_repo, membro_repo, usuario_repo, uow
    )
    app.dependency_overrides[get_usuario_atual] = dependency_override(gerente)
    app.dependency_overrides[get_caso_teste_service] = dependency_override(service)

    response = await api_client.get(f"/api/test-cases/{caso.id}")

    assert response.status_code == 404


async def test_test_case_de_outra_unidade_nao_e_encontrado(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    caso_repo, projeto_repo, time_repo, membro_repo, usuario_repo, uow = (
        AsyncMock() for _ in range(6)
    )
    caso_repo.obter_por_id.return_value = None
    service = CasoTesteServiceImpl(
        caso_repo, projeto_repo, time_repo, membro_repo, usuario_repo, uow
    )
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_caso_teste_service] = dependency_override(service)

    response = await api_client.get(f"/api/test-cases/{uuid4()}")

    assert response.status_code == 404
    caso_repo.obter_por_id.assert_awaited_once()
    assert caso_repo.obter_por_id.await_args.args[0] == usuario.unidade_id
