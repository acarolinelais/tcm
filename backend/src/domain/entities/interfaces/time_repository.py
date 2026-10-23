from typing import Protocol
from uuid import UUID

from src.domain.common.paged_result import PagedResult
from src.domain.entities.interfaces.repository_base import RepositoryBase
from src.domain.entities.time import Time


class TimeRepository(RepositoryBase[Time], Protocol):
    async def listar_paginado(
        self, unidade_id: UUID, page: int, page_size: int, setor_id: UUID | None = None
    ) -> PagedResult[Time]: ...
