from typing import Protocol
from uuid import UUID

from src.domain.entities.importacao_sdf import ImportacaoSdf
from src.domain.entities.interfaces.repository_base import RepositoryBase
from src.domain.queries.ultima_importacao_sdf import UltimaImportacaoSdf


class ImportacaoSdfRepository(RepositoryBase[ImportacaoSdf], Protocol):
    async def listar_por_projeto(
        self, unidade_id: UUID, projeto_id: UUID
    ) -> tuple[ImportacaoSdf, ...]: ...

    async def obter_ultima_ativa(
        self, unidade_id: UUID, projeto_id: UUID
    ) -> UltimaImportacaoSdf | None: ...
