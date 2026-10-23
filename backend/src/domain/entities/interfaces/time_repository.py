from typing import Protocol
from uuid import UUID

from src.domain.common.paged_result import PagedResult
from src.domain.entities.interfaces.repository_base import RepositoryBase
from src.domain.entities.time import Time


class TimeRepository(RepositoryBase[Time], Protocol):
    async def listar_paginado(
        self,
        unidade_id: UUID,
        page: int,
        page_size: int,
        setor_id: UUID | None = None,
        ativo: bool | None = None,
        busca: str | None = None,
    ) -> PagedResult[Time]: ...

    async def listar_por_setores(
        self,
        unidade_id: UUID,
        page: int,
        page_size: int,
        setor_ids: tuple[UUID, ...],
        setor_id: UUID | None = None,
        ativo: bool | None = None,
        busca: str | None = None,
    ) -> PagedResult[Time]: ...

    async def inativar_setor(self, unidade_id: UUID, setor_id: UUID) -> int: ...
