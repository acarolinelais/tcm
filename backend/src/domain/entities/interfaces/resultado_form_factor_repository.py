from datetime import datetime
from typing import Protocol
from uuid import UUID

from src.domain.common.paged_result import PagedResult
from src.domain.entities.interfaces.repository_base import RepositoryBase
from src.domain.entities.resultado_form_factor import ResultadoFormFactor
from src.domain.queries.form_factor_linha import FormFactorExecucaoLinha, FormFactorLinha


class ResultadoFormFactorRepository(RepositoryBase[ResultadoFormFactor], Protocol):
    async def listar_por_execucao(
        self, unidade_id: UUID, execucao_sdf_id: UUID
    ) -> tuple[ResultadoFormFactor, ...]: ...

    async def listar_form_factor_por_projeto(
        self,
        unidade_id: UUID,
        projeto_id: UUID,
        page: int,
        page_size: int,
        inicio: datetime | None = None,
        fim: datetime | None = None,
        responsavel_id: UUID | None = None,
        tc_id: str | None = None,
        sdf_id: str | None = None,
        modelo_dispositivo_id: UUID | None = None,
        resultado: str | None = None,
    ) -> PagedResult[FormFactorLinha]: ...

    async def listar_execucoes_form_factor_por_projeto(
        self,
        unidade_id: UUID,
        projeto_id: UUID,
        page: int,
        page_size: int,
        inicio: datetime | None = None,
        fim: datetime | None = None,
        responsavel_id: UUID | None = None,
        tc_id: str | None = None,
        sdf_id: str | None = None,
        modelo_dispositivo_id: UUID | None = None,
        resultado: str | None = None,
        origem: str | None = None,
    ) -> PagedResult[FormFactorExecucaoLinha]: ...
