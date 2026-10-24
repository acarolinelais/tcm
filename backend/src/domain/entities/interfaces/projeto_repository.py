from typing import Protocol
from uuid import UUID

from src.domain.common.paged_result import PagedResult
from src.domain.entities.interfaces.repository_base import RepositoryBase
from src.domain.entities.projeto import Projeto


class ProjetoRepository(RepositoryBase[Projeto], Protocol):
    async def desativar(self, unidade_id: UUID, projeto_id: UUID) -> None: ...

    async def listar_por_times(
        self,
        unidade_id: UUID,
        time_ids: tuple[UUID, ...],
        page: int,
        page_size: int,
    ) -> PagedResult[Projeto]: ...
