from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass(frozen=True)
class FalhaAberta:
    """Caso + device cujo resultado mais recente é FAIL (spec 070, RN-01)."""

    caso_teste_id: UUID
    tc_id: str
    titulo: str | None
    status: str
    projeto_id: UUID
    projeto_nome: str
    time_id: UUID
    modelo_dispositivo_id: UUID
    modelo_nome: str
    sdf_id: str | None
    motivo: str | None
    data_execucao: datetime
    responsavel_id: UUID
    responsavel_identificador: str | None
    backup_id: UUID | None


@dataclass(frozen=True, kw_only=True)
class FiltrosBugReport:
    projeto_id: UUID | None = None
    modelo_dispositivo_id: UUID | None = None
    responsavel: str | None = None
