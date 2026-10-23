from datetime import datetime
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from src.infrastructure.data.models.time_model import TimeModel
from src.infrastructure.repositories.time_repository import TimeRepositoryImpl


@pytest.mark.parametrize("filtrar_setor", [False, True])
async def test_listar_paginado_filtra_contagem_e_itens_por_unidade_e_setor(filtrar_setor):
    unidade_id, setor_id = uuid4(), uuid4()
    model = TimeModel(
        id=uuid4(),
        unidade_id=unidade_id,
        setor_id=setor_id,
        nome="Backend",
        gerente_id=None,
        ativo=True,
        created_at=datetime.now(),
        updated_at=None,
    )
    contagem, itens = MagicMock(), MagicMock()
    contagem.scalar_one.return_value = 11
    itens.scalars.return_value.all.return_value = [model]
    session = MagicMock(execute=AsyncMock(side_effect=[contagem, itens]))
    repo = TimeRepositoryImpl(session)

    resposta = await repo.listar_paginado(unidade_id, 2, 10, setor_id if filtrar_setor else None)

    assert resposta.total_count == 11
    assert resposta.page == 2
    assert resposta.items[0].id == model.id
    for chamada in session.execute.await_args_list:
        consulta = chamada.args[0].compile()
        assert "times.unidade_id =" in str(consulta)
        assert unidade_id in consulta.params.values()
        if filtrar_setor:
            assert "times.setor_id =" in str(consulta)
            assert setor_id in consulta.params.values()
    paginacao = session.execute.await_args_list[1].args[0].compile().params
    assert paginacao["param_1"] == 10
    assert paginacao["param_2"] == 10


async def test_listar_paginado_setor_sem_times_retorna_pagina_vazia():
    contagem, itens = MagicMock(), MagicMock()
    contagem.scalar_one.return_value = 0
    itens.scalars.return_value.all.return_value = []
    session = MagicMock(execute=AsyncMock(side_effect=[contagem, itens]))

    resposta = await TimeRepositoryImpl(session).listar_paginado(uuid4(), 1, 10, uuid4())

    assert resposta.items == []
    assert resposta.total_count == 0
    assert resposta.total_pages == 0
