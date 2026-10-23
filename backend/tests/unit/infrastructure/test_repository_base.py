from dataclasses import dataclass
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID, uuid4

import pytest
from sqlalchemy.orm import DeclarativeBase, Mapped, MappedAsDataclass, mapped_column
from src.infrastructure.repositories.repository_base import RepositoryBaseImpl


class _FakeBase(DeclarativeBase, MappedAsDataclass):
    pass


class FakeModel(_FakeBase):
    __tablename__ = "fake_model_para_teste"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    unidade_id: Mapped[UUID] = mapped_column()
    valor: Mapped[str] = mapped_column()


@dataclass
class FakeEntity:
    id: UUID
    unidade_id: UUID
    valor: str


class FakeRepository(RepositoryBaseImpl[FakeEntity, FakeModel]):
    model = FakeModel

    def _to_entity(self, model: FakeModel) -> FakeEntity:
        return FakeEntity(id=model.id, unidade_id=model.unidade_id, valor=model.valor)

    def _to_model(self, entity: FakeEntity) -> FakeModel:
        return FakeModel(id=entity.id, unidade_id=entity.unidade_id, valor=entity.valor)


@pytest.fixture
def session():
    # AsyncMock() propaga a assincronia pros filhos: session.execute.return_value também viraria
    # um AsyncMock, e .scalar_one_or_none() (síncrono, do SQLAlchemy) devolveria uma coroutine em
    # vez do valor. Por isso o return_value aqui é um MagicMock comum, explícito.
    session = MagicMock(add=MagicMock())
    session.execute = AsyncMock(return_value=MagicMock())
    session.merge = AsyncMock()
    return session


@pytest.fixture
def repo(session):
    return FakeRepository(session)


UNIDADE_ID = uuid4()


async def test_adicionar_chama_session_add_com_o_model_mapeado(repo, session):
    entidade_id = uuid4()
    await repo.adicionar(FakeEntity(id=entidade_id, unidade_id=UNIDADE_ID, valor="a"))

    session.add.assert_called_once_with(FakeModel(id=entidade_id, unidade_id=UNIDADE_ID, valor="a"))


async def test_obter_por_id_retorna_none_quando_nao_encontrado(repo, session):
    session.execute.return_value.scalar_one_or_none.return_value = None

    resultado = await repo.obter_por_id(UNIDADE_ID, uuid4())

    assert resultado is None


async def test_obter_por_id_retorna_entidade_quando_encontrado(repo, session):
    entidade_id = uuid4()
    session.execute.return_value.scalar_one_or_none.return_value = FakeModel(
        id=entidade_id, unidade_id=UNIDADE_ID, valor="a"
    )

    resultado = await repo.obter_por_id(UNIDADE_ID, entidade_id)

    assert resultado == FakeEntity(id=entidade_id, unidade_id=UNIDADE_ID, valor="a")


async def test_atualizar_chama_session_merge_com_o_model_mapeado(repo, session):
    entidade_id = uuid4()

    await repo.atualizar(FakeEntity(id=entidade_id, unidade_id=UNIDADE_ID, valor="b"))

    session.merge.assert_called_once_with(
        FakeModel(id=entidade_id, unidade_id=UNIDADE_ID, valor="b")
    )
