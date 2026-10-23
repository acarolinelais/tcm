from typing import Protocol
from uuid import UUID

from src.domain.common.paged_result import PagedResult
from src.domain.entities.interfaces.repository_base import RepositoryBase
from src.domain.entities.usuario import Usuario


class UsuarioRepository(RepositoryBase[Usuario], Protocol):
    async def listar_filtrado(
        self,
        unidade_id: UUID,
        page: int,
        page_size: int,
        nome: str | None = None,
        email: str | None = None,
        ativo: bool | None = None,
        perfil_id: UUID | None = None,
    ) -> PagedResult[Usuario]: ...

    async def listar_visiveis_filtrado(
        self,
        unidade_id: UUID,
        page: int,
        page_size: int,
        time_ids: tuple[UUID, ...],
        usuario_atual_id: UUID,
        nome: str | None = None,
        email: str | None = None,
        ativo: bool | None = None,
        perfil_id: UUID | None = None,
    ) -> PagedResult[Usuario]: ...

    async def existe_email(self, email: str, ignorar_id: UUID | None) -> bool: ...

    async def obter_por_email(self, email: str) -> Usuario | None: ...

    async def obter_perfil_padrao(self, unidade_id: UUID) -> UUID: ...
