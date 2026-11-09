from collections.abc import Sequence
from datetime import datetime
from typing import Protocol
from uuid import UUID

from src.domain.common.paged_result import PagedResult
from src.domain.entities.caso_teste import CasoTeste
from src.domain.entities.interfaces.repository_base import RepositoryBase
from src.domain.queries.caso_teste_com_responsavel import CasoTesteComResponsavel


class CasoTesteRepository(RepositoryBase[CasoTeste], Protocol):
    async def listar_por_projeto(
        self,
        unidade_id: UUID,
        projeto_id: UUID,
        page: int,
        page_size: int,
        responsavel_ids: Sequence[UUID] | None = None,
        priorizar_responsavel_id: UUID | None = None,
        associado_usuario_id: UUID | None = None,
        data_final_inicio: datetime | None = None,
        data_final_fim: datetime | None = None,
    ) -> PagedResult[CasoTeste]: ...

    async def existe_tc_id(self, unidade_id: UUID, projeto_id: UUID, tc_id: str) -> bool: ...

    async def contar_pendentes_de_conclusao(self, unidade_id: UUID, projeto_id: UUID) -> int:
        """Casos ativos do projeto fora de Done e Cancelled."""
        ...

    async def obter_por_projeto_tc_id(
        self, unidade_id: UUID, projeto_id: UUID, tc_id: str
    ) -> CasoTeste | None: ...

    async def listar_em_validacao(
        self, unidade_id: UUID, projeto_id: UUID
    ) -> tuple[CasoTeste, ...]: ...

    async def listar_cards_por_projeto(
        self, unidade_id: UUID, projeto_id: UUID
    ) -> tuple[CasoTesteComResponsavel, ...]: ...

    async def listar_todos_aprovados(
        self, unidade_id: UUID, projeto_id: UUID, caso_ids: Sequence[UUID]
    ) -> set[UUID]: ...

    async def limpar_todos_aprovados(self, unidade_id: UUID, caso_ids: Sequence[UUID]) -> None: ...

    async def marcar_todos_aprovados(
        self, unidade_id: UUID, projeto_id: UUID, caso_ids: Sequence[UUID]
    ) -> None: ...
