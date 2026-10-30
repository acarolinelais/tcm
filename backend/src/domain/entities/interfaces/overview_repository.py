from datetime import datetime
from typing import Protocol
from uuid import UUID

from src.domain.queries.resumo_overview import EscopoOverview, ResumoOverview


class OverviewRepository(Protocol):
    async def resumir(
        self,
        unidade_id: UUID,
        escopo: EscopoOverview,
        usuario_id: UUID,
        desde: datetime,
        fuso_horario: str,
    ) -> ResumoOverview:
        """Contagens dos casos do escopo e quantos entraram em Done por mês desde `desde`."""
        ...
