from typing import Protocol
from uuid import UUID

from src.application.schemas.form_factor import FormFactorResponse
from src.domain.common.usuario_autenticado import UsuarioAutenticado


class FormFactorService(Protocol):
    async def listar(
        self,
        usuario_atual: UsuarioAutenticado,
        projeto_id: UUID,
        page: int,
        page_size: int,
        semana: str | None = None,
        one_ui: str | None = None,
    ) -> FormFactorResponse: ...
