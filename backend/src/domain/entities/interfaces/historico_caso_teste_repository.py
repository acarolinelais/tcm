from typing import Protocol
from uuid import UUID

from src.domain.queries.registro_auditoria import RegistroAuditoria


class HistoricoCasoTesteRepository(Protocol):
    """Leitura do histórico gravado pelos triggers (ADR 0044). Ninguém escreve por aqui."""

    async def listar(self, unidade_id: UUID, caso_teste_id: UUID) -> list[RegistroAuditoria]:
        """Registros do caso e dos links de PR dele, do mais recente para o mais antigo."""
        ...
