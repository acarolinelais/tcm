from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass(frozen=True)
class RegistroAuditoria:
    """Uma linha de `auditoria_alteracoes` (ADR 0044), com o nome e o perfil gravados no momento."""

    table_name: str
    operation: str
    old_values: dict[str, Any] | None
    new_values: dict[str, Any] | None
    changed_fields: tuple[str, ...]
    usuario_nome: str | None
    usuario_perfil: str | None
    origem: str
    created_at: datetime
