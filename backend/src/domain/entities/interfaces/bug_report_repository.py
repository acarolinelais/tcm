from typing import Protocol
from uuid import UUID

from src.domain.common.paged_result import PagedResult
from src.domain.queries.bug_report import FalhaAberta, FiltrosBugReport
from src.domain.queries.resumo_overview import EscopoOverview


class BugReportRepository(Protocol):
    """Falhas em aberto do SDF (spec 070): só leitura."""

    async def listar_falhas_abertas(
        self,
        unidade_id: UUID,
        escopo: EscopoOverview,
        filtros: FiltrosBugReport,
        page: int,
        page_size: int,
    ) -> PagedResult[FalhaAberta]: ...
