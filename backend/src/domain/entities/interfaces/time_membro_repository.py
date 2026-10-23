from typing import Protocol
from uuid import UUID

from src.domain.entities.interfaces.repository_base import RepositoryBase
from src.domain.entities.time_membro import TimeMembro


class TimeMembroRepository(RepositoryBase[TimeMembro], Protocol):
    async def obter_por_time_e_usuario(
        self, unidade_id: UUID, time_id: UUID, usuario_id: UUID
    ) -> TimeMembro | None: ...

    async def listar_por_time(self, unidade_id: UUID, time_id: UUID) -> list[TimeMembro]: ...
