from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class UsuarioAutenticado:
    """Identidade do JWT (ADR 0014), passada aos services pra autorização (ADR 0015)."""

    id: UUID
    unidade_id: UUID
    admin_unidade: bool
