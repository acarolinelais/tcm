from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class ModeloDoProjeto:
    id: UUID
    nome: str
