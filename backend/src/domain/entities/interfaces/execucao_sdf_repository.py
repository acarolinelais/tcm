from typing import Protocol
from uuid import UUID

from src.domain.entities.execucao_sdf import ExecucaoSdf
from src.domain.entities.interfaces.repository_base import RepositoryBase


class ExecucaoSdfRepository(RepositoryBase[ExecucaoSdf], Protocol):
    async def listar_por_importacao(
        self, unidade_id: UUID, importacao_sdf_id: UUID
    ) -> tuple[ExecucaoSdf, ...]: ...
