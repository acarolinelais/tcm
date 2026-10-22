from uuid import UUID

from sqlalchemy import select

from src.domain.entities.usuario import Usuario
from src.infrastructure.data.models.usuario_model import UsuarioModel
from src.infrastructure.repositories.repository_base import RepositoryBaseImpl


class UsuarioRepositoryImpl(RepositoryBaseImpl[Usuario, UsuarioModel]):
    model = UsuarioModel

    async def existe_email(self, email: str, ignorar_id: UUID | None) -> bool:
        normalizado = Usuario.normalizar_email(email)
        stmt = select(UsuarioModel.id).where(UsuarioModel.email == normalizado)
        if ignorar_id is not None:
            stmt = stmt.where(UsuarioModel.id != ignorar_id)
        return (await self.session.execute(stmt)).first() is not None

    def _to_entity(self, model: UsuarioModel) -> Usuario:
        usuario = Usuario(model.nome, model.email)
        usuario.id = model.id
        usuario.ativo = model.ativo
        usuario.created_at = model.created_at
        usuario.updated_at = model.updated_at
        return usuario

    def _to_model(self, entity: Usuario) -> UsuarioModel:
        return UsuarioModel(
            id=entity.id,
            nome=entity.nome,
            email=entity.email,
            ativo=entity.ativo,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
