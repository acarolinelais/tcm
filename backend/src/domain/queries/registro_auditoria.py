from dataclasses import dataclass
from datetime import datetime
from typing import Any
from uuid import UUID

from src.domain.common.cor_avatar import CorAvatar


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


@dataclass(frozen=True)
class RegistroTimeline:
    """Um registro da auditoria com o caso dele e o responsável atual do caso (spec 054)."""

    registro: RegistroAuditoria
    caso_teste_id: UUID
    tc_id: str
    title: str | None
    responsavel_id: UUID
    responsavel_nome: str
    responsavel_cor_avatar: CorAvatar
