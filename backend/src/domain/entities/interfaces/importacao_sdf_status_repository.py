from datetime import datetime
from typing import Protocol
from uuid import UUID

from src.domain.entities.importacao_sdf_status import ImportacaoSdfStatus


class ImportacaoSdfStatusRepository(Protocol):
    async def adicionar(self, entity: ImportacaoSdfStatus) -> None: ...

    async def listar_revertiveis(
        self, unidade_id: UUID, importacao_sdf_id: UUID, importado_em: datetime
    ) -> tuple[ImportacaoSdfStatus, ...]: ...
