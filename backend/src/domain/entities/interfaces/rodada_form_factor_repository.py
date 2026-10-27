from typing import Protocol
from uuid import UUID

from src.domain.common.paged_result import PagedResult
from src.domain.entities.rodada_form_factor import RodadaFormFactor
from src.domain.queries.rodada_form_factor_caso import RodadaFormFactorCaso


class RodadaFormFactorRepository(Protocol):
    async def adicionar(self, rodada: RodadaFormFactor) -> None: ...

    async def obter_no_projeto(
        self, unidade_id: UUID, projeto_id: UUID, rodada_id: UUID
    ) -> RodadaFormFactor | None: ...

    async def listar_casos(
        self,
        unidade_id: UUID,
        projeto_id: UUID,
        rodada_id: UUID,
        page: int,
        page_size: int,
    ) -> PagedResult[RodadaFormFactorCaso]: ...
