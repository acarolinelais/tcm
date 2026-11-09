from typing import Protocol


class ContextoAuditoria(Protocol):
    """Diz ao histórico de onde vem a próxima escrita (ADR 0044), por exemplo `form_factor`."""

    async def definir_origem(self, origem: str) -> None: ...
