from typing import Protocol
from uuid import UUID


class Autenticador(Protocol):
    """Separa "validar credencial" de "quem é o usuário" (ADR 0014) — a implementação troca no
    futuro (ex.: API corporativa de e-mail) sem mexer no domínio de usuário/perfil."""

    async def autenticar(self, email: str, senha: str) -> UUID | None: ...
