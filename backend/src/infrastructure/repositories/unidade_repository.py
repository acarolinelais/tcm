from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.entities.unidade import Unidade
from src.infrastructure.data.models.unidade_model import UnidadeModel


class UnidadeRepositoryImpl:
    """Não estende RepositoryBaseImpl: Unidade não tem unidade_id pra filtrar por (ADR 0013)."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def obter_por_id(self, id: UUID) -> Unidade | None:
        model = await self.session.get(UnidadeModel, id)
        return self._to_entity(model) if model is not None else None

    async def adicionar(self, entity: Unidade) -> None:
        self.session.add(self._to_model(entity))

    def _to_entity(self, model: UnidadeModel) -> Unidade:
        unidade = Unidade(model.nome)
        unidade.id = model.id
        unidade.ativo = model.ativo
        unidade.created_at = model.created_at
        unidade.updated_at = model.updated_at
        return unidade

    def _to_model(self, entity: Unidade) -> UnidadeModel:
        return UnidadeModel(
            id=entity.id,
            nome=entity.nome,
            ativo=entity.ativo,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
