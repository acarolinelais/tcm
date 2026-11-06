from typing import Protocol
from uuid import UUID

from src.application.schemas.usuario import (
    AtualizarUsuarioRequest,
    CriarUsuarioRequest,
    RedefinirSenhaResponse,
    UsuarioResponse,
)
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado


class UsuarioService(Protocol):
    async def listar(
        self,
        usuario_atual: UsuarioAutenticado,
        page: int,
        page_size: int,
        nome: str | None = None,
        email: str | None = None,
        ativo: bool | None = None,
        perfil_id: UUID | None = None,
        responsavel_id: UUID | None = None,
        sem_responsavel: bool = False,
        setor_id: UUID | None = None,
    ) -> PagedResult[UsuarioResponse]: ...

    async def obter(self, usuario_atual: UsuarioAutenticado, id: UUID) -> UsuarioResponse: ...

    async def criar(
        self, usuario_atual: UsuarioAutenticado, request: CriarUsuarioRequest
    ) -> UsuarioResponse: ...

    async def atualizar(
        self, usuario_atual: UsuarioAutenticado, id: UUID, request: AtualizarUsuarioRequest
    ) -> UsuarioResponse: ...

    async def ativar(self, usuario_atual: UsuarioAutenticado, id: UUID) -> None: ...

    async def inativar(self, usuario_atual: UsuarioAutenticado, id: UUID) -> None: ...

    async def redefinir_senha(
        self, usuario_atual: UsuarioAutenticado, id: UUID
    ) -> RedefinirSenhaResponse: ...

    async def atribuir_responsavel(
        self, usuario_atual: UsuarioAutenticado, id: UUID, responsavel_id: UUID | None
    ) -> UsuarioResponse: ...
