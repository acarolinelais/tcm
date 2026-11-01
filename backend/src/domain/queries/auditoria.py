from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from uuid import UUID

from src.domain.queries.registro_auditoria import RegistroAuditoria

# Colunas que mudam sem ser escolha de ninguém: ficam fora do histórico (038) e da auditoria (052).
CAMPOS_OCULTOS = frozenset({"id", "unidade_id", "projeto_id", "ativo", "created_at", "updated_at"})


class AcaoAuditoria(StrEnum):
    CRIACAO = "criacao"
    ALTERACAO = "alteracao"
    PR_INCLUIDO = "pr_incluido"
    PR_REMOVIDO = "pr_removido"


class OrigemAuditoria(StrEnum):
    API = "api"
    FORM_FACTOR = "form_factor"


@dataclass(frozen=True, kw_only=True)
class FiltrosAuditoria:
    """Filtros da tela Auditoria (spec 052, RN-05). O período é UTC, com o fim exclusivo."""

    inicio: datetime | None = None
    fim: datetime | None = None
    usuario_ids: Sequence[UUID] = ()
    perfil: str | None = None
    acao: AcaoAuditoria | None = None
    tc_id: str | None = None
    projeto_id: UUID | None = None
    origem: OrigemAuditoria | None = None
    tela: str | None = None


@dataclass(frozen=True)
class LinhaAuditoria:
    """Um registro de `auditoria_alteracoes` com a ação, o Test Case e o projeto a que se refere."""

    id: int
    registro: RegistroAuditoria
    acao: AcaoAuditoria
    caso_teste_id: UUID
    tc_id: str
    projeto_id: UUID
    projeto_nome: str
    tela: str | None
