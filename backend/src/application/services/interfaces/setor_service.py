from typing import Protocol

from src.application.schemas.setor import CriarSetorRequest, SetorResponse
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado


class SetorService(Protocol):
    async def criar(
        self, usuario_atual: UsuarioAutenticado, request: CriarSetorRequest
    ) -> SetorResponse: ...

    async def listar(
        self, usuario_atual: UsuarioAutenticado, page: int, page_size: int
    ) -> PagedResult[SetorResponse]: ...
