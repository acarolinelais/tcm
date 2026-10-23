from typing import Protocol
from uuid import UUID

from src.domain.entities.unidade import Unidade


class UnidadeRepository(Protocol):
    """Não estende RepositoryBase: Unidade é a raiz do tenant, sem unidade_id pra filtrar por."""

    async def obter_por_id(self, id: UUID) -> Unidade | None: ...

    async def adicionar(self, entity: Unidade) -> None: ...
