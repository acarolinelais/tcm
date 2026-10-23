from typing import Protocol
from uuid import UUID

from src.application.schemas.time import (
    AdicionarMembroRequest,
    AtualizarPapelMembroRequest,
    CriarTimeRequest,
    TimeMembroResponse,
    TimeResponse,
)
from src.application.schemas.usuario import UsuarioResponse
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
        ativo: bool | None = None,
        busca: str | None = None,
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

    async def remover_membro(
        self, usuario_atual: UsuarioAutenticado, id: UUID, usuario_id: UUID
    ) -> None: ...

    async def listar_membros(
        self, usuario_atual: UsuarioAutenticado, id: UUID
    ) -> list[TimeMembroResponse]: ...

    async def listar_usuarios_disponiveis(
        self, usuario_atual: UsuarioAutenticado
    ) -> list[UsuarioResponse]: ...

    async def definir_ativo(
        self, usuario_atual: UsuarioAutenticado, id: UUID, ativo: bool
    ) -> TimeResponse: ...
