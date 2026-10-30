from dataclasses import dataclass
from uuid import UUID

from src.domain.entities.projeto import StatusProjeto


@dataclass(frozen=True)
class LinhaNavegacaoBoard:
    """Uma linha setor + time + projeto; time sem projeto vem com os campos do projeto vazios."""

    setor_id: UUID
    setor_nome: str
    time_id: UUID
    time_nome: str
    projeto_id: UUID | None
    projeto_nome: str | None
    projeto_status: StatusProjeto | None
