from datetime import datetime, timedelta
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from src.application.services.form_factor_service import (
    FormFactorServiceImpl,
    _intervalo_semana_iso,
)
from src.domain.common.exceptions import ForbiddenException
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.projeto import Projeto
from src.domain.entities.time import Time


async def test_consulta_form_factor_com_filtros_semana_e_one_ui():
    projeto_repo, time_repo, resultado_repo = (AsyncMock() for _ in range(3))
    unidade_id, usuario_id, time_id, setor_id = (uuid4() for _ in range(4))
    projeto = Projeto(unidade_id, time_id, "Clock", "9.5")
    time = Time(unidade_id, setor_id, "QA", usuario_id)
    usuario = UsuarioAutenticado(
        usuario_id,
        unidade_id,
        "GERENTE",
        permissoes=frozenset({"form_factor.consultar"}),
        setores_gerenciados=(setor_id,),
    )
    projeto_repo.obter_por_id.return_value = projeto
    time_repo.obter_por_id.return_value = time
    resultado_repo.listar_form_factor_por_projeto.return_value = PagedResult([], 1, 10, 0)
    service = FormFactorServiceImpl(projeto_repo, time_repo, resultado_repo)

    resultado = await service.listar(usuario, projeto.id, 1, 10, "2026-W12", "9.5")

    inicio = datetime.fromisocalendar(2026, 12, 1)
    resultado_repo.listar_form_factor_por_projeto.assert_awaited_once_with(
        unidade_id, projeto.id, 1, 10, inicio, inicio + timedelta(days=7), "9.5"
    )
    assert resultado.total_count == 0


@pytest.mark.parametrize("semana", ["2026-12", "2026-W00", "2026-W54"])
def test_rejeita_semana_que_nao_seja_semana_iso_valida(semana):
    with pytest.raises(ValueError):
        _intervalo_semana_iso(semana)


async def test_perfil_sem_permissao_nao_consulta_form_factor():
    projeto_repo, time_repo, resultado_repo = (AsyncMock() for _ in range(3))
    usuario = UsuarioAutenticado(uuid4(), uuid4(), "USUARIO_PADRAO")
    service = FormFactorServiceImpl(projeto_repo, time_repo, resultado_repo)

    with pytest.raises(ForbiddenException):
        await service.listar(usuario, uuid4(), 1, 10)

    resultado_repo.listar_form_factor_por_projeto.assert_not_awaited()
