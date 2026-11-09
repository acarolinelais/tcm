from datetime import UTC, datetime
from unittest.mock import AsyncMock
from uuid import uuid4

from src.api.dependencies import get_caso_teste_service, get_usuario_atual
from src.application.schemas.historico_caso_teste import (
    AlteracaoCasoTesteResponse,
    HistoricoCasoTesteResponse,
)
from src.application.services.caso_teste_service import CasoTesteServiceImpl
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from tests.functional.conftest import dependency_override

# Spec 038: GET /api/test-cases/{id}/historico.


async def test_historico_retorna_os_itens_do_mais_recente_ao_mais_antigo(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "GERENTE")
    service = AsyncMock()
    service.historico.return_value = HistoricoCasoTesteResponse(
        itens=[
            AlteracaoCasoTesteResponse(
                campo="status",
                valor_anterior="InProgress",
                valor_novo="InReview",
                usuario_nome="Ana",
                usuario_perfil="Key Person",
                origem="api",
                alterado_em=datetime(2026, 10, 30, 15, 0, tzinfo=UTC),
            )
        ]
    )
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_caso_teste_service] = dependency_override(service)
    caso_id = uuid4()

    response = await api_client.get(f"/api/test-cases/{caso_id}/historico")

    assert response.status_code == 200
    assert response.json()["itens"] == [
        {
            "campo": "status",
            "valor_anterior": "InProgress",
            "valor_novo": "InReview",
            "usuario_nome": "Ana",
            "usuario_perfil": "Key Person",
            "origem": "api",
            "alterado_em": "2026-10-30T15:00:00Z",
        }
    ]
    service.historico.assert_awaited_once_with(usuario, caso_id)


async def test_historico_de_caso_de_outra_unidade_retorna_404_sem_ler_a_auditoria(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    caso_repo, historico_repo = AsyncMock(), AsyncMock()
    caso_repo.obter_por_id.return_value = None
    service = CasoTesteServiceImpl(
        caso_repo, *(AsyncMock() for _ in range(6)), historico_repo=historico_repo
    )
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_caso_teste_service] = dependency_override(service)

    response = await api_client.get(f"/api/test-cases/{uuid4()}/historico")

    assert response.status_code == 404
    assert response.headers["content-type"].startswith("application/problem+json")
    assert caso_repo.obter_por_id.await_args.args[0] == usuario.unidade_id
    historico_repo.listar.assert_not_awaited()


async def test_historico_sem_token_retorna_401(api_client):
    response = await api_client.get(f"/api/test-cases/{uuid4()}/historico")

    assert response.status_code == 401
