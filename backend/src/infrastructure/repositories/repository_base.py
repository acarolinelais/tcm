from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.common.paged_result import PagedResult


class RepositoryBaseImpl[T, M]:
    model: type[M]

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def _to_entity(self, model: M) -> T:
        raise NotImplementedError

    def _to_model(self, entity: T) -> M:
        raise NotImplementedError

    async def obter_por_id(self, id: UUID) -> T | None:
        model = await self.session.get(self.model, id)
        return self._to_entity(model) if model is not None else None

    async def listar_paginado(self, page: int, page_size: int) -> PagedResult[T]:
        total_count = (
            await self.session.execute(select(func.count()).select_from(self.model))
        ).scalar_one()
        stmt = select(self.model).offset((page - 1) * page_size).limit(page_size)
        models = (await self.session.execute(stmt)).scalars().all()
        return PagedResult([self._to_entity(m) for m in models], page, page_size, total_count)

    async def adicionar(self, entity: T) -> None:
        self.session.add(self._to_model(entity))
