from typing import Protocol, TypeVar
from uuid import UUID

from src.domain.common.paged_result import PagedResult

T = TypeVar("T")


class RepositoryBase(Protocol[T]):
    async def obter_por_id(self, unidade_id: UUID, id: UUID) -> T | None: ...

    async def listar_paginado(
        self, unidade_id: UUID, page: int, page_size: int
    ) -> PagedResult[T]: ...

    async def adicionar(self, entity: T) -> None: ...

    async def atualizar(self, entity: T) -> None: ...
