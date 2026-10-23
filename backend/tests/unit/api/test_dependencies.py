from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi.security import HTTPAuthorizationCredentials
from src.api.dependencies import _obter_usuario_atual
from src.infrastructure.security.jwt import TokenPayload


@pytest.mark.asyncio
@pytest.mark.parametrize("time_ids", [(), (uuid4(),)])
async def test_identidade_kp_usa_apenas_vinculos_ativos_da_unidade(time_ids, monkeypatch):
    usuario_id, unidade_id, perfil_id, sessao_id = (uuid4() for _ in range(4))
    usuario = SimpleNamespace(
        id=usuario_id,
        unidade_id=unidade_id,
        ativo=True,
        auth_version=3,
        perfil_id=perfil_id,
        nome="Ponto focal",
        email="kp@example.com",
        senha_alteracao_obrigatoria=False,
    )
    sessao = SimpleNamespace(
        id=sessao_id,
        usuario_id=usuario_id,
        revoked_at=None,
        expires_at=datetime.now(UTC).replace(tzinfo=None) + timedelta(hours=1),
        auth_version=3,
    )
    perfil = SimpleNamespace(codigo="KP", nome="Pessoa-chave")
    permissoes = MagicMock()
    permissoes.scalars.return_value.all.return_value = ["times.consultar"]
    participacoes = MagicMock()
    participacoes.all.return_value = [SimpleNamespace(time_id=time_id) for time_id in time_ids]
    session = MagicMock()
    session.get = AsyncMock(side_effect=[sessao, usuario, perfil])
    session.execute = AsyncMock(side_effect=[permissoes, participacoes])

    from src.api import dependencies

    monkeypatch.setattr(
        dependencies,
        "decodificar_token",
        lambda _: TokenPayload(
            usuario_id=usuario_id,
            unidade_id=unidade_id,
            sessao_id=sessao_id,
            auth_version=3,
        ),
    )
    identidade = await _obter_usuario_atual(
        HTTPAuthorizationCredentials(scheme="Bearer", credentials="token"),
        session,
        permitir_senha_inicial=False,
    )

    assert identidade.perfil_codigo == "KP"
    assert identidade.time_ids == time_ids
    consulta_vinculos = str(session.execute.call_args_list[1].args[0]).lower()
    assert "time_membros.ativo is true" in consulta_vinculos
    assert "times.ativo is true" in consulta_vinculos
