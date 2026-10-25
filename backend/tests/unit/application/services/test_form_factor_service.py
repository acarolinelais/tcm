from datetime import datetime, timedelta
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from src.application.services.form_factor_service import (
    FormFactorServiceImpl,
    _intervalo_semana_iso,
)
from src.domain.common.exceptions import ForbiddenException, NotFoundException
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.projeto import Projeto
from src.domain.entities.time import Time
from src.domain.queries.form_factor_linha import FormFactorLinha
from src.domain.queries.modelo_do_projeto import ModeloDoProjeto


async def test_consulta_form_factor_com_semana_responsavel_e_modelos():
    projeto_repo, time_repo, resultado_repo, modelo_repo = (AsyncMock() for _ in range(4))
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
    caso_id, modelo_id = uuid4(), uuid4()
    resultado_repo.listar_form_factor_por_projeto.return_value = PagedResult(
        [FormFactorLinha(caso_id, "TC-001", usuario_id, None, None, {modelo_id: "Pass"})], 1, 10, 1
    )
    modelo_repo.listar_modelos_do_projeto.return_value = (
        ModeloDoProjeto(modelo_id, "SAMSUNG S25"),
    )
    service = FormFactorServiceImpl(projeto_repo, time_repo, resultado_repo, modelo_repo)

    resultado = await service.listar(usuario, projeto.id, 1, 10, "2026-W12", usuario_id)

    inicio = datetime.fromisocalendar(2026, 12, 1)
    resultado_repo.listar_form_factor_por_projeto.assert_awaited_once_with(
        unidade_id, projeto.id, 1, 10, inicio, inicio + timedelta(days=7), usuario_id
    )
    modelo_repo.listar_modelos_do_projeto.assert_awaited_once_with(unidade_id, projeto.id)
    assert [modelo.nome for modelo in resultado.modelos] == ["SAMSUNG S25"]
    assert resultado.items[0].resultados == {modelo_id: "Pass"}
    assert resultado.total_count == 1


@pytest.mark.parametrize("semana", ["2026-12", "2026-W00", "2026-W54"])
def test_rejeita_semana_que_nao_seja_semana_iso_valida(semana):
    with pytest.raises(ValueError):
        _intervalo_semana_iso(semana)


async def test_perfil_sem_permissao_nao_consulta_form_factor():
    projeto_repo, time_repo, resultado_repo, modelo_repo = (AsyncMock() for _ in range(4))
    usuario = UsuarioAutenticado(uuid4(), uuid4(), "USUARIO_PADRAO")
    service = FormFactorServiceImpl(projeto_repo, time_repo, resultado_repo, modelo_repo)

    with pytest.raises(ForbiddenException):
        await service.listar(usuario, uuid4(), 1, 10)

    resultado_repo.listar_form_factor_por_projeto.assert_not_awaited()
    modelo_repo.listar_modelos_do_projeto.assert_not_awaited()


async def test_gerente_membro_consulta_form_factor_e_sem_relacao_nao():
    projeto_repo, time_repo, resultado_repo, modelo_repo = (AsyncMock() for _ in range(4))
    unidade_id, time_id = uuid4(), uuid4()
    projeto = Projeto(unidade_id, time_id, "Clock", "9.5")
    time = Time(unidade_id, uuid4(), "QA", uuid4())
    time.id = time_id
    projeto_repo.obter_por_id.return_value = projeto
    time_repo.obter_por_id.return_value = time
    resultado_repo.listar_form_factor_por_projeto.return_value = PagedResult([], 1, 20, 0)
    modelo_repo.listar_modelos_do_projeto.return_value = ()
    service = FormFactorServiceImpl(projeto_repo, time_repo, resultado_repo, modelo_repo)

    def gerente(time_ids):
        return UsuarioAutenticado(
            uuid4(),
            unidade_id,
            "GERENTE",
            permissoes=frozenset({"form_factor.consultar"}),
            setores_gerenciados=(uuid4(),),
            time_ids=time_ids,
        )

    resposta = await service.listar(gerente((time_id,)), projeto.id, 1, 20)
    with pytest.raises(NotFoundException):
        await service.listar(gerente((uuid4(),)), projeto.id, 1, 20)

    assert resposta.total_count == 0
    resultado_repo.listar_form_factor_por_projeto.assert_awaited_once()
