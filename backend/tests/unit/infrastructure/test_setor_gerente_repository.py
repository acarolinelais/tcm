from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

from sqlalchemy.dialects import postgresql
from src.infrastructure.repositories.setor_gerente_repository import SetorGerenteRepositoryImpl


def criar_repo():
    session = MagicMock()
    session.execute = AsyncMock(return_value=MagicMock())
    return SetorGerenteRepositoryImpl(session), session


async def test_obter_filtra_unidade_setor_e_usuario():
    repo, session = criar_repo()
    session.execute.return_value.scalar_one_or_none.return_value = None

    await repo.obter(uuid4(), uuid4(), uuid4())

    sql = str(session.execute.call_args.args[0].compile(dialect=postgresql.dialect()))
    assert "setor_gerentes.unidade_id" in sql
    assert "setor_gerentes.setor_id" in sql
    assert "setor_gerentes.usuario_id" in sql


async def test_listar_por_setor_filtra_ativos_por_padrao_e_pode_incluir_historico():
    repo, session = criar_repo()
    session.execute.return_value.scalars.return_value.all.return_value = []

    await repo.listar_por_setor(uuid4(), uuid4())
    ativos_sql = str(session.execute.call_args.args[0].compile(dialect=postgresql.dialect()))
    assert "setor_gerentes.unidade_id" in ativos_sql
    assert "setor_gerentes.setor_id" in ativos_sql
    assert "setor_gerentes.ativo IS true" in ativos_sql

    await repo.listar_por_setor(uuid4(), uuid4(), somente_ativos=False)
    historico_sql = str(session.execute.call_args.args[0].compile(dialect=postgresql.dialect()))
    assert "setor_gerentes.unidade_id" in historico_sql
    assert "setor_gerentes.setor_id" in historico_sql
    assert "setor_gerentes.ativo IS true" not in historico_sql


async def test_listar_setores_gerenciados_exige_vinculo_ativo_na_unidade():
    repo, session = criar_repo()
    session.execute.return_value.scalars.return_value.all.return_value = []

    await repo.listar_setores_gerenciados(uuid4(), uuid4())

    sql = str(session.execute.call_args.args[0].compile(dialect=postgresql.dialect()))
    assert "setor_gerentes.unidade_id" in sql
    assert "setor_gerentes.usuario_id" in sql
    assert "setor_gerentes.ativo IS true" in sql


async def test_listar_gerentes_por_setores_nao_consulta_com_lista_vazia():
    repo, session = criar_repo()

    assert await repo.listar_gerentes_por_setores(uuid4(), ()) == ()
    session.execute.assert_not_awaited()


async def test_gerente_associado_exige_vinculo_ativo_na_unidade():
    repo, session = criar_repo()
    session.execute.return_value.first.return_value = None

    assert await repo.gerente_associado(uuid4(), uuid4(), uuid4()) is False

    sql = str(session.execute.call_args.args[0].compile(dialect=postgresql.dialect()))
    assert "setor_gerentes.unidade_id" in sql
    assert "setor_gerentes.setor_id" in sql
    assert "setor_gerentes.usuario_id" in sql
    assert "setor_gerentes.ativo IS true" in sql
