from typing import Protocol
from uuid import UUID

from src.application.schemas.time import (
    AdicionarMembroRequest,
    AtualizarPapelMembroRequest,
    CriarTimeRequest,
    TimeMembroResponse,
    TimeResponse,
)
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado


class TimeService(Protocol):
    async def criar(
        self, usuario_atual: UsuarioAutenticado, request: CriarTimeRequest
    ) -> TimeResponse: ...

    async def listar(
        self,
        usuario_atual: UsuarioAutenticado,
        page: int,
        page_size: int,
        setor_id: UUID | None = None,
    ) -> PagedResult[TimeResponse]: ...

    async def adicionar_membro(
        self, usuario_atual: UsuarioAutenticado, id: UUID, request: AdicionarMembroRequest
    ) -> TimeMembroResponse: ...

    async def atualizar_papel(
        self,
        usuario_atual: UsuarioAutenticado,
        id: UUID,
        usuario_id: UUID,
        request: AtualizarPapelMembroRequest,
    ) -> TimeMembroResponse: ...
