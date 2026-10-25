from typing import Protocol
from uuid import UUID

from src.domain.entities.interfaces.repository_base import RepositoryBase
from src.domain.entities.projeto_modelo import ProjetoModelo
from src.domain.queries.modelo_do_projeto import ModeloDoProjeto


class ProjetoModeloRepository(RepositoryBase[ProjetoModelo], Protocol):
    async def listar_por_projeto(
        self, unidade_id: UUID, projeto_id: UUID
    ) -> tuple[ProjetoModelo, ...]: ...

    async def listar_nomes_por_projetos(
        self, unidade_id: UUID, projeto_ids: tuple[UUID, ...]
    ) -> dict[UUID, tuple[str, ...]]: ...

    async def listar_ids_por_projetos(
        self, unidade_id: UUID, projeto_ids: tuple[UUID, ...]
    ) -> dict[UUID, tuple[UUID, ...]]: ...

    async def substituir_modelos(
        self, unidade_id: UUID, projeto_id: UUID, modelos_ids: tuple[UUID, ...]
    ) -> None: ...

    async def listar_modelos_do_projeto(
        self, unidade_id: UUID, projeto_id: UUID
    ) -> tuple[ModeloDoProjeto, ...]: ...
