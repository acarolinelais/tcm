from typing import Protocol
from uuid import UUID

from src.domain.entities.execucao_sdf import ExecucaoSdf
from src.domain.entities.interfaces.repository_base import RepositoryBase


class ExecucaoSdfRepository(RepositoryBase[ExecucaoSdf], Protocol):
    async def listar_por_importacao(
        self, unidade_id: UUID, importacao_sdf_id: UUID
    ) -> tuple[ExecucaoSdf, ...]: ...

    async def obter_por_rodada_e_caso(
        self, unidade_id: UUID, rodada_id: UUID, caso_teste_id: UUID
    ) -> ExecucaoSdf | None: ...

    async def obter_rodada_atual_do_caso(
        self, unidade_id: UUID, caso_teste_id: UUID
    ) -> UUID | None: ...

    async def existe_sdf_id_importado_no_projeto(
        self, unidade_id: UUID, projeto_id: UUID, sdf_id: str
    ) -> bool: ...
