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

    async def obter_por_id(self, unidade_id: UUID, id: UUID) -> T | None:
        stmt = select(self.model).where(self.model.id == id, self.model.unidade_id == unidade_id)
        model = (await self.session.execute(stmt)).scalar_one_or_none()
        return self._to_entity(model) if model is not None else None

    async def listar_paginado(self, unidade_id: UUID, page: int, page_size: int) -> PagedResult[T]:
        filtro = self.model.unidade_id == unidade_id
        total_count = (
            await self.session.execute(select(func.count()).select_from(self.model).where(filtro))
        ).scalar_one()
        stmt = select(self.model).where(filtro).offset((page - 1) * page_size).limit(page_size)
        models = (await self.session.execute(stmt)).scalars().all()
        return PagedResult([self._to_entity(m) for m in models], page, page_size, total_count)

    async def adicionar(self, entity: T) -> None:
        self.session.add(self._to_model(entity))

    async def atualizar(self, entity: T) -> None:
        # obter_por_id devolve uma entidade de domínio nova, desconectada do model rastreado pela
        # sessão (ADR 0016) — merge() localiza a linha pela chave primária e aplica os campos.
        await self.session.merge(self._to_model(entity))
