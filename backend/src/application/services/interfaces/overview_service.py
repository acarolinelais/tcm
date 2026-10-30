from typing import Protocol

from src.application.schemas.overview import OverviewResponse
from src.domain.common.usuario_autenticado import UsuarioAutenticado


class OverviewService(Protocol):
    async def obter(
        self, usuario_atual: UsuarioAutenticado, fuso_horario: str
    ) -> OverviewResponse: ...
