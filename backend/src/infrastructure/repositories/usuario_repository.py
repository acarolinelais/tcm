from uuid import UUID

from sqlalchemy import func, select, union, update

from src.domain.common.paged_result import PagedResult
from src.domain.entities.usuario import Usuario
from src.infrastructure.data.models.time_membro_model import TimeMembroModel
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

    async def listar_visiveis(
        self,
        unidade_id: UUID,
        page: int,
        page_size: int,
        time_ids: tuple[UUID, ...],
        usuario_atual_id: UUID,
    ) -> PagedResult[Usuario]:
        consultas = [
            select(UsuarioModel.id.label("usuario_id")).where(UsuarioModel.id == usuario_atual_id)
        ]
        if time_ids:
            consultas.append(
                select(TimeMembroModel.usuario_id.label("usuario_id")).where(
                    TimeMembroModel.unidade_id == unidade_id,
                    TimeMembroModel.ativo.is_(True),
                    TimeMembroModel.time_id.in_(time_ids),
                )
            )
        visible_ids = union(*consultas)
        total = (
            await self.session.execute(
                select(func.count())
                .select_from(UsuarioModel)
                .where(UsuarioModel.unidade_id == unidade_id, UsuarioModel.id.in_(visible_ids))
            )
        ).scalar_one()
        stmt = (
            select(UsuarioModel)
            .where(UsuarioModel.unidade_id == unidade_id, UsuarioModel.id.in_(visible_ids))
            .order_by(UsuarioModel.nome, UsuarioModel.id)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        models = (await self.session.execute(stmt)).scalars().all()
        return PagedResult([self._to_entity(model) for model in models], page, page_size, total)

    async def pertence_a_escopo(
        self, unidade_id: UUID, usuario_id: UUID, time_ids: tuple[UUID, ...]
    ) -> bool:
        if not time_ids:
            return False
        stmt = select(TimeMembroModel.id).where(
            TimeMembroModel.unidade_id == unidade_id,
            TimeMembroModel.usuario_id == usuario_id,
            TimeMembroModel.ativo.is_(True),
            TimeMembroModel.time_id.in_(time_ids),
        )
        return (await self.session.execute(stmt)).first() is not None

    async def invalidar_sessoes(self, usuario_id: UUID) -> None:
        await self.session.execute(
            update(UsuarioModel)
            .where(UsuarioModel.id == usuario_id)
            .values(auth_version=UsuarioModel.auth_version + 1)
        )

    def _to_entity(self, model: UsuarioModel) -> Usuario:
        usuario = Usuario(model.unidade_id, model.nome, model.email)
        usuario.id = model.id
        usuario.admin_unidade = model.admin_unidade
        usuario.senha_hash = model.senha_hash
        usuario.perfil_id = model.perfil_id
        usuario.auth_version = model.auth_version
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
            perfil_id=entity.perfil_id,
            auth_version=entity.auth_version,
            ativo=entity.ativo,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
