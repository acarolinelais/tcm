from collections.abc import Sequence
from datetime import date
from typing import Protocol
from uuid import UUID

from src.domain.common.paged_result import PagedResult
from src.domain.queries.historico_form_factor import (
    CasoHistorico,
    FiltrosCasoHistorico,
    LinhaHistoricoExecucao,
)


class HistoricoFormFactorRepository(Protocol):
    """Consultas da tela Resultados Gerais (spec 032): só leitura, sobre execuções e resultados."""

    async def listar_casos(
        self,
        unidade_id: UUID,
        projeto_id: UUID,
        filtros: FiltrosCasoHistorico,
        page: int,
        page_size: int,
    ) -> PagedResult[CasoHistorico]: ...

    async def obter_caso(self, unidade_id: UUID, caso_teste_id: UUID) -> CasoHistorico | None: ...

    async def listar_datas(
        self,
        unidade_id: UUID,
        projeto_id: UUID,
        filtros: FiltrosCasoHistorico,
        fuso_horario: str,
        *,
        limite: int,
    ) -> tuple[date, ...]: ...

    async def listar_resultados(
        self,
        unidade_id: UUID,
        projeto_id: UUID,
        caso_ids: Sequence[UUID],
        fuso_horario: str,
        datas: Sequence[date] | None = None,
    ) -> tuple[LinhaHistoricoExecucao, ...]: ...

    async def listar_ultimo_sdf_por_modelo(
        self, unidade_id: UUID, projeto_id: UUID, caso_ids: Sequence[UUID]
    ) -> dict[UUID, dict[UUID, str | None]]: ...
