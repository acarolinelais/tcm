from collections.abc import Sequence
from typing import Protocol
from uuid import UUID

from src.application.schemas.auditoria import RegistroAuditoriaResponse
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.queries.auditoria import AcaoAuditoria, OrigemAuditoria


class AuditoriaService(Protocol):
    async def listar(
        self,
        usuario_atual: UsuarioAutenticado,
        page: int,
        page_size: int,
        *,
        data_inicio: str | None = None,
        data_fim: str | None = None,
        fuso_horario: str = "UTC",
        usuario_ids: Sequence[UUID] = (),
        perfil: str | None = None,
        acao: AcaoAuditoria | None = None,
        tc_id: str | None = None,
        projeto_id: UUID | None = None,
        origem: OrigemAuditoria | None = None,
        tela: str | None = None,
    ) -> PagedResult[RegistroAuditoriaResponse]: ...
