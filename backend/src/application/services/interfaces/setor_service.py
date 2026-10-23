from typing import Protocol
from uuid import UUID

from src.application.schemas.setor import (
    AtualizarSetorRequest,
    CriarSetorRequest,
    SetorGerenteResponse,
    SetorResponse,
)
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado


class SetorService(Protocol):
    async def criar(
        self, usuario_atual: UsuarioAutenticado, request: CriarSetorRequest
    ) -> SetorResponse: ...

    async def listar(
        self,
        usuario_atual: UsuarioAutenticado,
        page: int,
        page_size: int,
        ativo: bool | None = None,
        busca: str | None = None,
    ) -> PagedResult[SetorResponse]: ...

    async def atualizar(
        self, usuario_atual: UsuarioAutenticado, setor_id: UUID, request: AtualizarSetorRequest
    ) -> SetorResponse: ...

    async def listar_gerentes(
        self, usuario_atual: UsuarioAutenticado, setor_id: UUID
    ) -> list[SetorGerenteResponse]: ...

    async def associar_gerente(
        self, usuario_atual: UsuarioAutenticado, setor_id: UUID, gerente_id: UUID
    ) -> SetorGerenteResponse: ...

    async def desassociar_gerente(
        self, usuario_atual: UsuarioAutenticado, setor_id: UUID, gerente_id: UUID
    ) -> None: ...
