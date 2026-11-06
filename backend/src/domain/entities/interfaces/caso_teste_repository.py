from datetime import datetime
from typing import Protocol
from uuid import UUID

from src.domain.common.paged_result import PagedResult
from src.domain.entities.caso_teste import CasoTeste
from src.domain.entities.interfaces.repository_base import RepositoryBase


class CasoTesteRepository(RepositoryBase[CasoTeste], Protocol):
    async def listar_por_projeto(
        self,
        unidade_id: UUID,
        projeto_id: UUID,
        page: int,
        page_size: int,
        responsavel_id: UUID | None = None,
        priorizar_responsavel_id: UUID | None = None,
        associado_usuario_id: UUID | None = None,
        data_final_inicio: datetime | None = None,
        data_final_fim: datetime | None = None,
    ) -> PagedResult[CasoTeste]: ...

    async def existe_tc_id(self, unidade_id: UUID, projeto_id: UUID, tc_id: str) -> bool: ...

    async def obter_por_projeto_tc_id(
        self, unidade_id: UUID, projeto_id: UUID, tc_id: str
    ) -> CasoTeste | None: ...
