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

    async def obter_por_email(self, email: str) -> Usuario | None:
        normalizado = Usuario.normalizar_email(email)
        stmt = select(UsuarioModel).where(UsuarioModel.email == normalizado)
        model = (await self.session.execute(stmt)).scalar_one_or_none()
        return self._to_entity(model) if model is not None else None

    def _to_entity(self, model: UsuarioModel) -> Usuario:
        usuario = Usuario(model.unidade_id, model.nome, model.email)
        usuario.id = model.id
        usuario.admin_unidade = model.admin_unidade
        usuario.senha_hash = model.senha_hash
        usuario.ativo = model.ativo
        usuario.created_at = model.created_at
        usuario.updated_at = model.updated_at
        return usuario

    def _to_model(self, entity: Usuario) -> UsuarioModel:
        return UsuarioModel(
            id=entity.id,
            unidade_id=entity.unidade_id,
            nome=entity.nome,
            email=entity.email,
            senha_hash=entity.senha_hash,
            admin_unidade=entity.admin_unidade,
            ativo=entity.ativo,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
