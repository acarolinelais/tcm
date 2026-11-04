import os
from datetime import datetime
from uuid import uuid4

import pytest
import pytest_asyncio
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from src.infrastructure.data.models.importacao_sdf_model import ImportacaoSdfModel
from src.infrastructure.repositories.execucao_sdf_repository import ExecucaoSdfRepositoryImpl
from tests.integration.test_resultado_form_factor_repository import _Cenario

pytestmark = pytest.mark.skipif(
    not os.environ.get("SDF_TEST_DATABASE_URL"),
    reason="Defina SDF_TEST_DATABASE_URL para executar a integração com Postgres.",
)


@pytest_asyncio.fixture
async def cenario():
    engine = create_async_engine(os.environ["SDF_TEST_DATABASE_URL"])
    try:
        async with engine.connect() as conexao:
            transacao = await conexao.begin()
            session = AsyncSession(
                bind=conexao, join_transaction_mode="create_savepoint", expire_on_commit=False
            )
            yield await _Cenario(session, uuid4()).montar()
            await session.close()
            await transacao.rollback()
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_sdf_id_importado_no_projeto_ignora_caixa_e_espacos(cenario):
    caso = await cenario.caso("Keyboard_000001")
    await cenario.importar(
        caso, "Sdf-Keyboard-01", datetime(2026, 10, 21, 18, 43), {cenario.s26: "PASS"}
    )
    repo = ExecucaoSdfRepositoryImpl(cenario.session)

    assert await repo.existe_sdf_id_importado_no_projeto(
        cenario.unidade_id, cenario.projeto_id, " sdf-keyboard-01 "
    )
    assert await repo.existe_sdf_id_importado_no_projeto(
        cenario.unidade_id, cenario.projeto_id, "SDF-KEYBOARD-01"
    )


@pytest.mark.asyncio
async def test_sdf_id_de_outro_projeto_outra_unidade_ou_importacao_inativa_nao_conta(cenario):
    caso = await cenario.caso("Keyboard_000001")
    await cenario.importar(caso, "SDF-ABC", datetime(2026, 10, 21, 18, 43), {cenario.s26: "PASS"})
    repo = ExecucaoSdfRepositoryImpl(cenario.session)

    assert not await repo.existe_sdf_id_importado_no_projeto(
        cenario.unidade_id, cenario.projeto_id, "SDF-OUTRO"
    )
    assert not await repo.existe_sdf_id_importado_no_projeto(cenario.unidade_id, uuid4(), "SDF-ABC")
    assert not await repo.existe_sdf_id_importado_no_projeto(uuid4(), cenario.projeto_id, "SDF-ABC")
    await cenario.session.execute(
        update(ImportacaoSdfModel)
        .where(ImportacaoSdfModel.projeto_id == cenario.projeto_id)
        .values(ativo=False)
    )
    assert not await repo.existe_sdf_id_importado_no_projeto(
        cenario.unidade_id, cenario.projeto_id, "SDF-ABC"
    )
