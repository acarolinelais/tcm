from typing import Protocol, TypeVar
from uuid import UUID

from src.domain.common.paged_result import PagedResult

T = TypeVar("T")


class RepositoryBase(Protocol[T]):
    async def obter_por_id(self, id: UUID) -> T | None: ...

    async def listar_paginado(self, page: int, page_size: int) -> PagedResult[T]: ...

    async def adicionar(self, entity: T) -> None: ...
    # "atualizar" não precisa de método: uma entidade rastreada é persistida no commit.
