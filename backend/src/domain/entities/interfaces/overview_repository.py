from datetime import datetime
from typing import Protocol
from uuid import UUID

from src.domain.queries.resumo_overview import (
    EscopoOverview,
    PassRate,
    ResumoOverview,
    ResumoPessoal,
    ResumoTime,
)


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

    async def resumir_time(
        self,
        unidade_id: UUID,
        escopo: EscopoOverview,
        desde_dia: datetime,
        desde_semana: datetime,
        fuso_horario: str,
    ) -> ResumoTime:
        """Escopo de times: criação desde `desde_dia`, Done por semana desde `desde_semana`."""
        ...

    async def burndown_executado(
        self, unidade_id: UUID, projeto_id: UUID, fins: list[datetime]
    ) -> list[int]:
        """Para cada instante de `fins`, quantos casos do projeto existiam e não estavam em Done."""
        ...

    async def pass_rate_ultima_rodada(self, unidade_id: UUID, projeto_id: UUID) -> PassRate | None:
        """Resultados por modelo da rodada mais recente; None se o projeto não tem rodada."""
        ...

    async def resumir_pessoal(
        self, unidade_id: UUID, pessoa_id: UUID, desde: datetime, fuso_horario: str
    ) -> ResumoPessoal:
        """Casos em que a pessoa é a principal; Done por dia desde `desde`, no fuso pedido."""
        ...
