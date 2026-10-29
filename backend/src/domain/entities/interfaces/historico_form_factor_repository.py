from collections.abc import Sequence
from datetime import date, datetime
from typing import Protocol
from uuid import UUID

from src.domain.queries.historico_form_factor import CasoHistorico, LinhaHistoricoExecucao


class HistoricoFormFactorRepository(Protocol):
    """Consultas da tela Resultados Gerais (spec 032): só leitura, sobre execuções e resultados."""

    async def listar_casos(
        self,
        unidade_id: UUID,
        projeto_id: UUID,
        busca: str | None = None,
        tc_id: str | None = None,
        modelo_dispositivo_id: UUID | None = None,
        inicio: datetime | None = None,
        fim: datetime | None = None,
    ) -> tuple[CasoHistorico, ...]: ...

    async def obter_caso(self, unidade_id: UUID, caso_teste_id: UUID) -> CasoHistorico | None: ...

    async def listar_datas(
        self,
        unidade_id: UUID,
        projeto_id: UUID,
        caso_ids: Sequence[UUID],
        fuso_horario: str,
        inicio: datetime | None = None,
        fim: datetime | None = None,
        limite: int = 7,
        modelo_dispositivo_id: UUID | None = None,
    ) -> tuple[date, ...]: ...

    async def listar_resultados(
        self,
        unidade_id: UUID,
        projeto_id: UUID,
        caso_ids: Sequence[UUID],
        fuso_horario: str,
        datas: Sequence[date] | None = None,
    ) -> tuple[LinhaHistoricoExecucao, ...]: ...

    async def listar_modelos_da_ultima_execucao(
        self, unidade_id: UUID, projeto_id: UUID, caso_ids: Sequence[UUID]
    ) -> dict[UUID, tuple[UUID, ...]]: ...
