from typing import Protocol
from uuid import UUID

from src.domain.common.paged_result import PagedResult
from src.domain.entities.interfaces.repository_base import RepositoryBase
from src.domain.entities.projeto import Projeto
from src.domain.queries.linha_navegacao_board import LinhaNavegacaoBoard


class ProjetoRepository(RepositoryBase[Projeto], Protocol):
    async def listar_associados_por_times(
        self,
        unidade_id: UUID,
        time_ids: tuple[UUID, ...] | None,
        usuario_id: UUID,
        page: int,
        page_size: int,
    ) -> PagedResult[Projeto]: ...

    async def desativar(self, unidade_id: UUID, projeto_id: UUID) -> None: ...

    async def listar_por_times(
        self,
        unidade_id: UUID,
        time_ids: tuple[UUID, ...],
        page: int,
        page_size: int,
    ) -> PagedResult[Projeto]: ...

    async def listar_navegacao(
        self, unidade_id: UUID, time_ids: tuple[UUID, ...] | None
    ) -> tuple[LinhaNavegacaoBoard, ...]: ...

    async def tem_atribuicoes_fora_do_time(
        self, unidade_id: UUID, projeto_id: UUID, time_id: UUID
    ) -> bool: ...
