from typing import Protocol
from uuid import UUID

from src.application.schemas.projeto import (
    AtualizarStatusProjetoRequest,
    CriarProjetoRequest,
    ProjetoResponse,
)
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado


class ProjetoService(Protocol):
    async def criar(
        self, usuario_atual: UsuarioAutenticado, request: CriarProjetoRequest
    ) -> ProjetoResponse: ...

    async def listar(
        self, usuario_atual: UsuarioAutenticado, page: int, page_size: int
    ) -> PagedResult[ProjetoResponse]: ...

    async def atualizar_status(
        self,
        usuario_atual: UsuarioAutenticado,
        projeto_id: UUID,
        request: AtualizarStatusProjetoRequest,
    ) -> ProjetoResponse: ...
