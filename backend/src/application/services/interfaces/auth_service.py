from typing import Protocol
from uuid import UUID

from src.application.schemas.auth import (
    AlterarSenhaRequest,
    AtualizarPreferenciasRequest,
    LoginRequest,
    PreferenciasResponse,
    SessaoEmitida,
    TrocarPropriaSenhaRequest,
)


class AuthService(Protocol):
    async def login(self, request: LoginRequest) -> SessaoEmitida: ...

    async def renovar(self, refresh_token: str) -> SessaoEmitida: ...

    async def logout(self, refresh_token: str | None, sessao_id: UUID | None) -> None: ...

    async def atualizar_preferencias(
        self, unidade_id: UUID, usuario_id: UUID, request: AtualizarPreferenciasRequest
    ) -> PreferenciasResponse: ...

    async def alterar_senha_inicial(
        self, usuario_id: UUID, sessao_id: UUID, request: AlterarSenhaRequest
    ) -> SessaoEmitida: ...

    async def alterar_propria_senha(
        self, usuario_id: UUID, sessao_id: UUID, request: TrocarPropriaSenhaRequest
    ) -> SessaoEmitida: ...
