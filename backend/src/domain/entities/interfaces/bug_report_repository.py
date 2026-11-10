from typing import Protocol
from uuid import UUID

from src.domain.common.paged_result import PagedResult
from src.domain.queries.bug_report import CasoComFalhas, FiltrosBugReport
from src.domain.queries.resumo_overview import EscopoOverview


class BugReportRepository(Protocol):
    """Falhas do SDF por caso (spec 072): só leitura."""

    async def listar_casos_com_falhas(
        self,
        unidade_id: UUID,
        escopo: EscopoOverview,
        filtros: FiltrosBugReport,
        page: int,
        page_size: int,
    ) -> PagedResult[CasoComFalhas]: ...
