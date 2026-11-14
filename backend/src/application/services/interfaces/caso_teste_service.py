from collections.abc import Sequence
from datetime import date
from typing import Protocol
from uuid import UUID

from src.application.schemas.caso_teste import (
    AtualizarCasoTesteRequest,
    CasoTesteDetalheResponse,
    CasoTesteResponse,
    CriarCasoTesteRequest,
)
from src.application.schemas.historico_caso_teste import HistoricoCasoTesteResponse
from src.application.schemas.kanban import KanbanResponse
from src.application.schemas.link_pull_request import (
    AdicionarLinkPullRequestRequest,
    LinkPullRequestResponse,
    LinksPullRequestResponse,
)
from src.application.schemas.timeline import TimelineResponse
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.caso_teste import StatusCasoTeste


class CasoTesteService(Protocol):
    async def obter(
        self, usuario_atual: UsuarioAutenticado, caso_id: UUID
    ) -> CasoTesteDetalheResponse: ...

    async def historico(
        self, usuario_atual: UsuarioAutenticado, caso_id: UUID
    ) -> HistoricoCasoTesteResponse: ...

    async def timeline(
        self,
        usuario_atual: UsuarioAutenticado,
        projeto_id: UUID,
        inicio: date,
        fim: date,
        fuso_horario: str,
        responsavel_ids: Sequence[UUID],
        caso_ids: Sequence[UUID],
    ) -> TimelineResponse: ...

    async def listar(
        self,
        usuario_atual: UsuarioAutenticado,
        projeto_id: UUID,
        page: int,
        page_size: int,
        responsavel_ids: Sequence[UUID] | None = None,
        associados_a_mim: bool = False,
        semana: str | None = None,
        fuso_horario: str = "UTC",
    ) -> PagedResult[CasoTesteResponse]: ...

    async def obter_kanban(
        self, usuario_atual: UsuarioAutenticado, projeto_id: UUID
    ) -> KanbanResponse: ...

    async def criar(
        self,
        usuario_atual: UsuarioAutenticado,
        projeto_id: UUID,
        request: CriarCasoTesteRequest,
    ) -> CasoTesteResponse: ...

    async def atualizar(
        self,
        usuario_atual: UsuarioAutenticado,
        caso_id: UUID,
        request: AtualizarCasoTesteRequest,
    ) -> CasoTesteResponse: ...

    async def transferir_para_backup(
        self, usuario_atual: UsuarioAutenticado, caso_id: UUID
    ) -> CasoTesteResponse: ...

    async def mudar_status_da_correcao(
        self, usuario_atual: UsuarioAutenticado, caso_id: UUID, status: StatusCasoTeste
    ) -> CasoTesteResponse: ...

    async def listar_pull_requests(
        self, usuario_atual: UsuarioAutenticado, caso_id: UUID
    ) -> LinksPullRequestResponse: ...

    async def adicionar_pull_request(
        self,
        usuario_atual: UsuarioAutenticado,
        caso_id: UUID,
        request: AdicionarLinkPullRequestRequest,
    ) -> LinkPullRequestResponse: ...

    async def remover_pull_request(
        self, usuario_atual: UsuarioAutenticado, caso_id: UUID, link_id: UUID
    ) -> None: ...
