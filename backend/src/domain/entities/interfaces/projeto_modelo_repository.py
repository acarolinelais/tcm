from typing import Protocol
from uuid import UUID

from src.domain.entities.interfaces.repository_base import RepositoryBase
from src.domain.entities.projeto_modelo import ProjetoModelo


class ProjetoModeloRepository(RepositoryBase[ProjetoModelo], Protocol):
    async def listar_por_projeto(
        self, unidade_id: UUID, projeto_id: UUID
    ) -> tuple[ProjetoModelo, ...]: ...

    async def listar_nomes_por_projetos(
        self, unidade_id: UUID, projeto_ids: tuple[UUID, ...]
    ) -> dict[UUID, tuple[str, ...]]: ...
