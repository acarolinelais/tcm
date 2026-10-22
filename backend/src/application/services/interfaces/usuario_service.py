from typing import Protocol
from uuid import UUID

from src.application.schemas.usuario import (
    AtualizarUsuarioRequest,
    CriarUsuarioRequest,
    UsuarioResponse,
)
from src.domain.common.paged_result import PagedResult


class UsuarioService(Protocol):
    async def listar(self, page: int, page_size: int) -> PagedResult[UsuarioResponse]: ...

    async def obter(self, id: UUID) -> UsuarioResponse: ...

    async def criar(self, request: CriarUsuarioRequest) -> UsuarioResponse: ...

    async def atualizar(self, id: UUID, request: AtualizarUsuarioRequest) -> UsuarioResponse: ...

    async def ativar(self, id: UUID) -> None: ...

    async def inativar(self, id: UUID) -> None: ...
