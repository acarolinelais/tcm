from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from src.application.services.usuario_service import UsuarioServiceImpl
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado


@pytest.mark.parametrize("administrador", [True, False])
async def test_listar_encaminha_filtros_sem_ampliar_escopo(administrador):
    unidade_id, usuario_id, time_id, perfil_id = uuid4(), uuid4(), uuid4(), uuid4()
    repo = AsyncMock()
    resultado = PagedResult([], page=2, page_size=10, total_count=0)
    repo.listar_filtrado.return_value = resultado
    repo.listar_visiveis_filtrado.return_value = resultado
    atual = UsuarioAutenticado(
        id=usuario_id,
        unidade_id=unidade_id,
        perfil_codigo="ADMIN_UNIDADE" if administrador else "USUARIO_PADRAO",
        permissoes=frozenset({"usuarios.consultar"}),
        time_ids=(time_id,),
    )
    service = UsuarioServiceImpl(repo, AsyncMock())

    await service.listar(
        atual,
        2,
        10,
        nome="Ana",
        email="example.com",
        ativo=False,
        perfil_id=perfil_id,
    )

    if administrador:
        repo.listar_filtrado.assert_awaited_once_with(
            unidade_id, 2, 10, "Ana", "example.com", False, perfil_id
        )
        repo.listar_visiveis_filtrado.assert_not_awaited()
    else:
        repo.listar_visiveis_filtrado.assert_awaited_once_with(
            unidade_id, 2, 10, (time_id,), usuario_id, "Ana", "example.com", False, perfil_id,
            usuario_id,
        )
        repo.listar_filtrado.assert_not_awaited()
