from collections.abc import Callable

from src.application.schemas.auth import LoginRequest, TokenResponse
from src.domain.common.exceptions import CredenciaisInvalidasException
from src.domain.entities.interfaces.autenticador import Autenticador
from src.domain.entities.interfaces.usuario_repository import UsuarioRepository
from src.domain.entities.usuario import Usuario


class AuthServiceImpl:
    def __init__(
        self,
        autenticador: Autenticador,
        usuario_repo: UsuarioRepository,
        criar_token: Callable[[Usuario], str],
    ) -> None:
        self._autenticador = autenticador
        self._usuario_repo = usuario_repo
        self._criar_token = criar_token

    async def login(self, request: LoginRequest) -> TokenResponse:
        usuario_id = await self._autenticador.autenticar(request.email, request.senha)
        if usuario_id is None:
            raise CredenciaisInvalidasException("Credenciais inválidas.")
        usuario = await self._usuario_repo.obter_por_email(request.email)
        if usuario is None or usuario.id != usuario_id or not usuario.ativo:
            raise CredenciaisInvalidasException("Credenciais inválidas.")
        return TokenResponse(access_token=self._criar_token(usuario))
