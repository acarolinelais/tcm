from uuid import UUID

from src.domain.entities.interfaces.usuario_repository import UsuarioRepository
from src.infrastructure.security.senha_hasher import verificar_senha


class AutenticadorLocal:
    def __init__(self, usuario_repo: UsuarioRepository) -> None:
        self._usuario_repo = usuario_repo

    async def autenticar(self, email: str, senha: str) -> UUID | None:
        usuario = await self._usuario_repo.obter_por_email(email)
        if usuario is None or usuario.senha_hash is None:
            return None
        if not verificar_senha(senha, usuario.senha_hash):
            return None
        return usuario.id
