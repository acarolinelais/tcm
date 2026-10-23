from uuid import uuid4

import pytest
from src.api.dependencies import get_usuario_atual
from src.api.main import app
from src.domain.common.usuario_autenticado import UsuarioAutenticado


def identidade_override(identidade):
    async def override():
        return identidade

    return override


@pytest.mark.parametrize(
    "query",
    [
        "page=0",
        "page_size=0",
        "page_size=101",
        "ativo=nao-e-booleano",
        "perfil_id=nao-e-uuid",
        "nome=",
        "email=",
    ],
)
async def test_listagem_rejeita_parametros_de_filtro_invalidos(api_client, query):
    app.dependency_overrides[get_usuario_atual] = identidade_override(
        UsuarioAutenticado(id=uuid4(), unidade_id=uuid4(), perfil_codigo="ADMIN_UNIDADE")
    )
    response = await api_client.get(f"/api/usuarios?{query}")

    assert response.status_code == 422
