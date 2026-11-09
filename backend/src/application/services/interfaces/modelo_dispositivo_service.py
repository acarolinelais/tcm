from typing import Protocol
from uuid import UUID

from src.application.schemas.modelo_dispositivo import (
    AtualizarModeloDispositivoRequest,
    CriarModeloDispositivoRequest,
    ModeloDispositivoOpcaoResponse,
    ModeloDispositivoResponse,
)
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado


class ModeloDispositivoService(Protocol):
    async def listar(
        self,
        usuario_atual: UsuarioAutenticado,
        page: int,
        page_size: int,
        ativo: bool | None = None,
        busca: str | None = None,
    ) -> PagedResult[ModeloDispositivoResponse]: ...

    async def listar_opcoes(
        self,
        usuario_atual: UsuarioAutenticado,
        page: int,
        page_size: int,
        busca: str | None = None,
    ) -> PagedResult[ModeloDispositivoOpcaoResponse]: ...

    async def criar(
        self, usuario_atual: UsuarioAutenticado, request: CriarModeloDispositivoRequest
    ) -> ModeloDispositivoResponse: ...

    async def atualizar(
        self,
        usuario_atual: UsuarioAutenticado,
        modelo_id: UUID,
        request: AtualizarModeloDispositivoRequest,
    ) -> ModeloDispositivoResponse: ...
