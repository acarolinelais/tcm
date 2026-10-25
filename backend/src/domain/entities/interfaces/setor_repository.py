from typing import Protocol
from uuid import UUID

from src.domain.common.paged_result import PagedResult
from src.domain.entities.interfaces.repository_base import RepositoryBase
from src.domain.entities.setor import Setor


class SetorRepository(RepositoryBase[Setor], Protocol):
    async def listar_paginado(
        self,
        unidade_id: UUID,
        page: int,
        page_size: int,
        *,
        ativo: bool | None = None,
        busca: str | None = None,
        setor_ids: tuple[UUID, ...] | None = None,
    ) -> PagedResult[Setor]: ...

    async def ids_por_times(
        self, unidade_id: UUID, time_ids: tuple[UUID, ...]
    ) -> tuple[UUID, ...]: ...

    async def nomes_por_ids(
        self, unidade_id: UUID, setor_ids: tuple[UUID, ...]
    ) -> dict[UUID, str]: ...

    async def possui_times_ativos(self, unidade_id: UUID, setor_id: UUID) -> bool: ...
