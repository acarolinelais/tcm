from typing import Protocol
from uuid import UUID

from src.application.schemas.overview import (
    OverviewPessoalResponse,
    OverviewProjetoResponse,
    OverviewResponse,
    OverviewTimeResponse,
)
from src.domain.common.usuario_autenticado import UsuarioAutenticado


class OverviewService(Protocol):
    async def obter(
        self, usuario_atual: UsuarioAutenticado, fuso_horario: str
    ) -> OverviewResponse: ...

    async def obter_time(
        self, usuario_atual: UsuarioAutenticado, fuso_horario: str
    ) -> OverviewTimeResponse: ...

    async def obter_projeto(
        self, usuario_atual: UsuarioAutenticado, projeto_id: UUID, fuso_horario: str
    ) -> OverviewProjetoResponse: ...

    async def obter_pessoal(
        self, usuario_atual: UsuarioAutenticado, fuso_horario: str
    ) -> OverviewPessoalResponse: ...
