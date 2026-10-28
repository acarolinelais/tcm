from collections.abc import Sequence
from typing import Protocol
from uuid import UUID

from src.application.schemas.caso_teste import (
    AtualizarCasoTesteRequest,
    CasoTesteDetalheResponse,
    CasoTesteResponse,
    CriarCasoTesteRequest,
)
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado


class CasoTesteService(Protocol):
    async def obter(
        self, usuario_atual: UsuarioAutenticado, caso_id: UUID
    ) -> CasoTesteDetalheResponse: ...

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
