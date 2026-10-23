from datetime import datetime
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from sqlalchemy.dialects import postgresql
from src.infrastructure.data.models.usuario_model import UsuarioModel
from src.infrastructure.repositories.usuario_repository import UsuarioRepositoryImpl


@pytest.fixture
def session():
    session = MagicMock()
    session.execute = AsyncMock(return_value=MagicMock())
    return session


@pytest.fixture
def repo(session):
    return UsuarioRepositoryImpl(session)


async def test_obter_por_email_retorna_none_quando_nao_encontrado(repo, session):
    session.execute.return_value.scalar_one_or_none.return_value = None

    resultado = await repo.obter_por_email("ana@example.com")

    assert resultado is None


async def test_obter_por_email_retorna_usuario_quando_encontrado(repo, session):
    unidade_id = uuid4()
    session.execute.return_value.scalar_one_or_none.return_value = UsuarioModel(
        id=uuid4(), unidade_id=unidade_id, nome="Ana", email="ana@example.com", ativo=True
    )

    resultado = await repo.obter_por_email("ana@example.com")

    assert resultado is not None
    assert resultado.email == "ana@example.com"
    assert resultado.unidade_id == unidade_id


def resultado_consulta(quantidade: int, itens: list[UsuarioModel]):
    resultado_contagem = MagicMock()
    resultado_contagem.scalar_one.return_value = quantidade
    resultado_itens = MagicMock()
    resultado_itens.scalars.return_value.all.return_value = itens
    return resultado_contagem, resultado_itens


def usuario_model(unidade_id, perfil_id):
    return UsuarioModel(
        id=uuid4(),
        unidade_id=unidade_id,
        nome="Ana Silva",
        email="ana@example.com",
        perfil_id=perfil_id,
        ativo=True,
        created_at=datetime(2026, 1, 1),
    )


async def test_listar_filtrado_compõe_filtros_escopo_contagem_e_paginacao(repo, session):
    unidade_id, perfil_id = uuid4(), uuid4()
    session.execute.side_effect = resultado_consulta(1, [usuario_model(unidade_id, perfil_id)])

    resultado = await repo.listar_filtrado(
        unidade_id, 2, 10, " ana ", "EXAMPLE", True, perfil_id
    )

    assert resultado.total_count == 1
    assert (resultado.page, resultado.page_size) == (2, 10)
    assert resultado.items[0].email == "ana@example.com"
    query_contagem, query_itens = [call.args[0] for call in session.execute.call_args_list]
    assert "usuarios.unidade_id" in str(query_contagem.compile(dialect=postgresql.dialect()))
    sql = str(query_itens.compile(dialect=postgresql.dialect()))
    assert "usuarios.nome ILIKE" in sql
    assert "usuarios.email ILIKE" in sql
    assert "usuarios.ativo IS true" in sql
    assert "usuarios.perfil_id" in sql
    assert "LIMIT" in sql and "OFFSET" in sql


async def test_listar_visiveis_filtrado_preserva_unidade_e_escopo_de_times(repo, session):
    unidade_id, usuario_id, time_id, perfil_id = uuid4(), uuid4(), uuid4(), uuid4()
    session.execute.side_effect = resultado_consulta(1, [usuario_model(unidade_id, perfil_id)])

    await repo.listar_visiveis_filtrado(
        unidade_id, 1, 10, (time_id,), usuario_id, nome="Ana", ativo=True
    )

    query_contagem, query_itens = [call.args[0] for call in session.execute.call_args_list]
    sql_contagem = str(query_contagem.compile(dialect=postgresql.dialect()))
    sql_itens = str(query_itens.compile(dialect=postgresql.dialect()))
    for sql in (sql_contagem, sql_itens):
        assert "usuarios.unidade_id" in sql
        assert "usuarios.id IN" in sql
        assert "usuarios.nome ILIKE" in sql
        assert "usuarios.ativo IS true" in sql
    assert "time_membros" in sql_itens
    assert "UNION" in sql_itens
