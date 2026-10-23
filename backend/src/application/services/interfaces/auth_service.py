from typing import Protocol

from src.application.schemas.auth import LoginRequest, TokenResponse


class AuthService(Protocol):
    async def login(self, request: LoginRequest) -> TokenResponse: ...
