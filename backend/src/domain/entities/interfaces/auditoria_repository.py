from typing import Protocol
from uuid import UUID

from src.domain.common.paged_result import PagedResult
from src.domain.queries.auditoria import FiltrosAuditoria, LinhaAuditoria


class AuditoriaRepository(Protocol):
    """Leitura da auditoria da unidade (spec 052). Ninguém escreve por aqui (ADR 0044)."""

    async def listar(
        self, unidade_id: UUID, filtros: FiltrosAuditoria, page: int, page_size: int
    ) -> PagedResult[LinhaAuditoria]:
        """Registros da unidade que atendem aos filtros, do mais recente para o mais antigo."""
        ...
