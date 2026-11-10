from dataclasses import replace

from src.application.schemas.bug_report import CasoComFalhasResponse, to_response
from src.application.services.form_factor_service import exigir_consulta_execucoes
from src.application.services.overview_service import escopo_do_usuario
from src.application.validators.semana import (
    fuso_horario_valido,
    intervalo_dia,
    intervalo_semana_iso,
)
from src.domain.common.exceptions import InvalidInputException
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
        dia: str | None = None,
        semana: str | None = None,
        fuso_horario: str = "UTC",
    ) -> PagedResult[CasoComFalhasResponse]:
        # Spec 070, RN-06: quem vê a General Results vê a página, com o recorte da Overview. Um
        # projeto fora do escopo não tem falhas para mostrar.
        exigir_consulta_execucoes(usuario_atual)
        if dia and semana:
            raise InvalidInputException("Escolha um dia ou uma semana, não os dois.")
        fuso_horario_valido(fuso_horario)
        inicio, fim = (
            intervalo_dia(dia, fuso_horario) if dia else intervalo_semana_iso(semana, fuso_horario)
        )
        escopo = escopo_do_usuario(usuario_atual)
        if escopo.time_ids == ():
            # Gestão sem time: nada a mostrar, como na Overview.
            return PagedResult([], page, page_size, 0)
        casos = await self._bug_report_repo.listar_casos_com_falhas(
            usuario_atual.unidade_id,
            escopo,
            replace(filtros, inicio=inicio, fim=fim),
            page,
            page_size,
        )
        return casos.map(to_response)
