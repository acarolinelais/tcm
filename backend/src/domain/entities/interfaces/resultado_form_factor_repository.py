from typing import Protocol
from uuid import UUID

from src.domain.entities.interfaces.repository_base import RepositoryBase
from src.domain.entities.resultado_form_factor import ResultadoFormFactor


class ResultadoFormFactorRepository(RepositoryBase[ResultadoFormFactor], Protocol):
    async def listar_por_execucao(
        self, unidade_id: UUID, execucao_sdf_id: UUID
    ) -> tuple[ResultadoFormFactor, ...]: ...
