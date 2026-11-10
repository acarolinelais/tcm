from typing import Protocol
from uuid import UUID

from src.application.schemas.navegacao_board import NavegacaoBoardResponse
from src.application.schemas.projeto import (
    AtualizarProjetoRequest,
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
        self,
        usuario_atual: UsuarioAutenticado,
        page: int,
        page_size: int,
        associados_a_mim: bool = False,
    ) -> PagedResult[ProjetoResponse]: ...

    async def listar_navegacao(
        self, usuario_atual: UsuarioAutenticado
    ) -> NavegacaoBoardResponse: ...

    async def obter(
        self, usuario_atual: UsuarioAutenticado, projeto_id: UUID
    ) -> ProjetoResponse: ...

    async def atualizar_status(
        self,
        usuario_atual: UsuarioAutenticado,
        projeto_id: UUID,
        request: AtualizarStatusProjetoRequest,
    ) -> ProjetoResponse: ...

    async def atualizar(
        self,
        usuario_atual: UsuarioAutenticado,
        projeto_id: UUID,
        request: AtualizarProjetoRequest,
        fuso_horario: str,
    ) -> ProjetoResponse: ...

    async def excluir(self, usuario_atual: UsuarioAutenticado, projeto_id: UUID) -> None: ...
