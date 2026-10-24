from typing import Protocol
from uuid import UUID

from src.domain.common.paged_result import PagedResult
from src.domain.entities.interfaces.repository_base import RepositoryBase
from src.domain.entities.modelo_dispositivo import ModeloDispositivo


class ModeloDispositivoRepository(RepositoryBase[ModeloDispositivo], Protocol):
    async def listar_paginado(
        self,
        unidade_id: UUID,
        page: int,
        page_size: int,
        ativo: bool | None = None,
        busca: str | None = None,
    ) -> PagedResult[ModeloDispositivo]: ...

    async def listar_por_ids(
        self, unidade_id: UUID, ids: tuple[UUID, ...]
    ) -> tuple[ModeloDispositivo, ...]: ...

    async def existe_nome(self, unidade_id: UUID, nome: str, ignorar_id: UUID | None) -> bool: ...
