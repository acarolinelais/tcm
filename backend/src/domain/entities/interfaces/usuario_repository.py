from typing import Protocol
from uuid import UUID

from src.domain.entities.interfaces.repository_base import RepositoryBase
from src.domain.entities.usuario import Usuario


class UsuarioRepository(RepositoryBase[Usuario], Protocol):
    async def existe_email(self, email: str, ignorar_id: UUID | None) -> bool: ...
