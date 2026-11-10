from datetime import datetime
from typing import Protocol
from uuid import UUID

from src.domain.entities.importacao_sdf_status import ImportacaoSdfStatus


class ImportacaoSdfStatusRepository(Protocol):
    async def adicionar(self, entity: ImportacaoSdfStatus) -> None: ...

    async def listar_revertiveis(
        self, unidade_id: UUID, importacao_sdf_id: UUID, importado_em: datetime
    ) -> tuple[ImportacaoSdfStatus, ...]: ...

    async def entrou_em_validacao_depois_do_dev_fix(
        self, unidade_id: UUID, caso_teste_id: UUID, dev_fix_em: datetime
    ) -> bool: ...
