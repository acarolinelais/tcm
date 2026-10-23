from typing import Protocol
from uuid import UUID

from src.domain.entities.setor_gerente import SetorGerente


class SetorGerenteRepository(Protocol):
    async def obter(
        self, unidade_id: UUID, setor_id: UUID, usuario_id: UUID
    ) -> SetorGerente | None: ...

    async def listar_por_setor(
        self, unidade_id: UUID, setor_id: UUID, somente_ativos: bool = True
    ) -> list[SetorGerente]: ...

    async def listar_setores_gerenciados(
        self, unidade_id: UUID, usuario_id: UUID
    ) -> tuple[UUID, ...]: ...

    async def listar_gerentes_por_setores(
        self, unidade_id: UUID, setor_ids: tuple[UUID, ...]
    ) -> tuple[UUID, ...]: ...

    async def gerente_associado(
        self, unidade_id: UUID, setor_id: UUID, usuario_id: UUID
    ) -> bool: ...

    async def inativar_por_setor(self, unidade_id: UUID, setor_id: UUID) -> tuple[UUID, ...]: ...

    async def listar_gerentes(self, unidade_id: UUID, setor_id: UUID) -> list[SetorGerente]: ...

    async def adicionar(self, associacao: SetorGerente) -> None: ...

    async def atualizar(self, associacao: SetorGerente) -> None: ...
