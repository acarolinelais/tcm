from typing import Protocol

from src.application.schemas.bug_report import CasoComFalhasResponse, CorrecaoConcluidaResponse
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.queries.bug_report import FiltrosBugReport
from src.domain.queries.correcao_concluida import FiltrosCorrecoesConcluidas


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

    async def listar_my_fixes(
        self,
        usuario_atual: UsuarioAutenticado,
        filtros: FiltrosBugReport,
        page: int,
        page_size: int,
    ) -> PagedResult[CasoComFalhasResponse]: ...

    async def listar_concluidas(
        self,
        usuario_atual: UsuarioAutenticado,
        filtros: FiltrosCorrecoesConcluidas,
        page: int,
        page_size: int,
        dia: str | None = None,
        semana: str | None = None,
        fuso_horario: str = "UTC",
    ) -> PagedResult[CorrecaoConcluidaResponse]: ...
