from dataclasses import replace

from src.application.schemas.bug_report import (
    CasoComFalhasResponse,
    CorrecaoConcluidaResponse,
    to_correcao_concluida_response,
    to_response,
)
from src.application.services.form_factor_service import exigir_consulta_execucoes
from src.application.services.overview_service import escopo_do_usuario
from src.application.validators.semana import (
    fuso_horario_valido,
    intervalo_dia,
    intervalo_semana_iso,
)
from src.domain.common.exceptions import ForbiddenException, InvalidInputException
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.interfaces.bug_report_repository import BugReportRepository
from src.domain.entities.interfaces.correcao_repository import CorrecaoRepository
from src.domain.queries.bug_report import FiltrosBugReport
from src.domain.queries.correcao_concluida import FiltrosCorrecoesConcluidas


class BugReportServiceImpl:
    def __init__(
        self, bug_report_repo: BugReportRepository, correcao_repo: CorrecaoRepository | None = None
    ) -> None:
        self._bug_report_repo = bug_report_repo
        self._correcao_repo = correcao_repo

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
        return await self._listar(
            usuario_atual, replace(filtros, inicio=inicio, fim=fim), page, page_size
        )

    async def listar_my_fixes(
        self,
        usuario_atual: UsuarioAutenticado,
        filtros: FiltrosBugReport,
        page: int,
        page_size: int,
    ) -> PagedResult[CasoComFalhasResponse]:
        """Spec 073: os casos em correção do projeto. O dev vê os que ele corrige (RN-08); admin,
        gerente e KP, que não corrigem casos, veem todos os do escopo deles (o da SDF Failures)."""
        if not usuario_atual.pode("test_cases.consultar"):
            raise ForbiddenException("Você não tem permissão para consultar Test Cases.")
        corretor_id = usuario_atual.id if escopo_do_usuario(usuario_atual).pessoa_id else None
        return await self._listar(
            usuario_atual,
            replace(filtros, em_correcao=True, corretor_id=corretor_id),
            page,
            page_size,
        )

    async def listar_concluidas(
        self,
        usuario_atual: UsuarioAutenticado,
        filtros: FiltrosCorrecoesConcluidas,
        page: int,
        page_size: int,
        dia: str | None = None,
        semana: str | None = None,
        fuso_horario: str = "UTC",
    ) -> PagedResult[CorrecaoConcluidaResponse]:
        """Spec 076, RN-12 a RN-15: as tentativas fechadas, com o escopo da My Fixes."""
        if not usuario_atual.pode("test_cases.consultar"):
            raise ForbiddenException("Você não tem permissão para consultar Test Cases.")
        if self._correcao_repo is None:
            raise RuntimeError("Repositório de correções não configurado.")
        if dia and semana:
            raise InvalidInputException("Escolha um dia ou uma semana, não os dois.")
        fuso_horario_valido(fuso_horario)
        inicio, fim = (
            intervalo_dia(dia, fuso_horario) if dia else intervalo_semana_iso(semana, fuso_horario)
        )
        escopo = escopo_do_usuario(usuario_atual)
        if escopo.time_ids == ():
            return PagedResult([], page, page_size, 0)
        # O dev só tem as próprias (RN-13): o filtro por corretor não vale para ele.
        corretor_id = None if escopo.pessoa_id else filtros.corretor_id
        correcoes = await self._correcao_repo.listar_concluidas(
            usuario_atual.unidade_id,
            escopo,
            replace(filtros, inicio=inicio, fim=fim, corretor_id=corretor_id),
            page,
            page_size,
            fuso_horario,
        )
        return correcoes.map(to_correcao_concluida_response)

    async def _listar(
        self,
        usuario_atual: UsuarioAutenticado,
        filtros: FiltrosBugReport,
        page: int,
        page_size: int,
    ) -> PagedResult[CasoComFalhasResponse]:
        escopo = escopo_do_usuario(usuario_atual)
        if escopo.time_ids == ():
            # Gestão sem time: nada a mostrar, como na Overview.
            return PagedResult([], page, page_size, 0)
        casos = await self._bug_report_repo.listar_casos_com_falhas(
            usuario_atual.unidade_id, escopo, filtros, page, page_size
        )
        return casos.map(to_response)
