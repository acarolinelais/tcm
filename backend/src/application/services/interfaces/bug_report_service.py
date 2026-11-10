from typing import Protocol

from src.application.schemas.bug_report import CasoComFalhasResponse
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.queries.bug_report import FiltrosBugReport


class BugReportService(Protocol):
    async def listar(
        self,
        usuario_atual: UsuarioAutenticado,
        filtros: FiltrosBugReport,
        page: int,
        page_size: int,
        dia: str | None = None,
        semana: str | None = None,
        fuso_horario: str = "UTC",
    ) -> PagedResult[CasoComFalhasResponse]: ...
