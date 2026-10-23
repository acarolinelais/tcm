from typing import Protocol
from uuid import UUID

from src.application.schemas.auth import (
    AlterarSenhaRequest,
    LoginRequest,
    RefreshRequest,
    TokenResponse,
)


class AuthService(Protocol):
    async def login(self, request: LoginRequest) -> TokenResponse: ...

    async def renovar(self, request: RefreshRequest) -> TokenResponse: ...

    async def logout(self, sessao_id: UUID) -> None: ...

    async def alterar_senha_inicial(
        self, usuario_id: UUID, sessao_id: UUID, request: AlterarSenhaRequest
    ) -> TokenResponse: ...
