from dataclasses import dataclass
from unittest.mock import AsyncMock, MagicMock

import pytest
from src.infrastructure.repositories.repository_base import RepositoryBaseImpl


@dataclass
class FakeModel:
    id: int
    valor: str


@dataclass
class FakeEntity:
    id: int
    valor: str


class FakeRepository(RepositoryBaseImpl[FakeEntity, FakeModel]):
    model = FakeModel

    def _to_entity(self, model: FakeModel) -> FakeEntity:
        return FakeEntity(id=model.id, valor=model.valor)

    def _to_model(self, entity: FakeEntity) -> FakeModel:
        return FakeModel(id=entity.id, valor=entity.valor)


@pytest.fixture
def session():
    return MagicMock(get=AsyncMock(), execute=AsyncMock(), add=MagicMock())


@pytest.fixture
def repo(session):
    return FakeRepository(session)


async def test_adicionar_chama_session_add_com_o_model_mapeado(repo, session):
    await repo.adicionar(FakeEntity(id=1, valor="a"))

    session.add.assert_called_once_with(FakeModel(id=1, valor="a"))


async def test_obter_por_id_retorna_none_quando_nao_encontrado(repo, session):
    session.get.return_value = None

    resultado = await repo.obter_por_id(1)

    assert resultado is None


async def test_obter_por_id_retorna_entidade_quando_encontrado(repo, session):
    session.get.return_value = FakeModel(id=1, valor="a")

    resultado = await repo.obter_por_id(1)

    assert resultado == FakeEntity(id=1, valor="a")
