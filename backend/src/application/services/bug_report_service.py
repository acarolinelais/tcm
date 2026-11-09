from src.application.schemas.bug_report import FalhaAbertaResponse, to_response
from src.application.services.form_factor_service import exigir_consulta_execucoes
from src.application.services.overview_service import escopo_do_usuario
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.interfaces.bug_report_repository import BugReportRepository
from src.domain.queries.bug_report import FiltrosBugReport


class BugReportServiceImpl:
    def __init__(self, bug_report_repo: BugReportRepository) -> None:
        self._bug_report_repo = bug_report_repo

    async def listar(
        self,
        usuario_atual: UsuarioAutenticado,
        filtros: FiltrosBugReport,
        page: int,
        page_size: int,
    ) -> PagedResult[FalhaAbertaResponse]:
        # Spec 070, RN-06: quem vê a General Results vê o Bug Reports, com o recorte da Overview.
        exigir_consulta_execucoes(usuario_atual)
        escopo = escopo_do_usuario(usuario_atual)
        if escopo.time_ids == ():
            # Gestão sem time: nada a mostrar, como na Overview.
            return PagedResult([], page, page_size, 0)
        falhas = await self._bug_report_repo.listar_falhas_abertas(
            usuario_atual.unidade_id, escopo, filtros, page, page_size
        )
        return falhas.map(to_response)
