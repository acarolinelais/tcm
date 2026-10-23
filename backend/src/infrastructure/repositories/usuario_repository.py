from uuid import UUID

from sqlalchemy import func, or_, select, union, update

from src.domain.common.idioma_preferido import IdiomaPreferido
from src.domain.common.paged_result import PagedResult
from src.domain.entities.usuario import Usuario
from src.infrastructure.data.models.perfil_model import PerfilModel
from src.infrastructure.data.models.time_membro_model import TimeMembroModel
from src.infrastructure.data.models.usuario_model import UsuarioModel
from src.infrastructure.repositories.repository_base import RepositoryBaseImpl


class UsuarioRepositoryImpl(RepositoryBaseImpl[Usuario, UsuarioModel]):
    model = UsuarioModel

    async def obter_perfil_padrao(self, unidade_id: UUID) -> UUID:
        stmt = select(PerfilModel.id).where(
            PerfilModel.unidade_id == unidade_id, PerfilModel.codigo == "USUARIO_PADRAO"
        )
        perfil_id = (await self.session.execute(stmt)).scalar_one_or_none()
        if perfil_id is None:
            raise RuntimeError("Perfil padrão da unidade não foi inicializado.")
        return perfil_id

    async def gerente_ativo_na_unidade(self, unidade_id: UUID, usuario_id: UUID) -> bool:
        stmt = (
            select(UsuarioModel.id)
            .join(PerfilModel, PerfilModel.id == UsuarioModel.perfil_id)
            .where(
                UsuarioModel.id == usuario_id,
                UsuarioModel.unidade_id == unidade_id,
                UsuarioModel.ativo.is_(True),
                PerfilModel.unidade_id == unidade_id,
                PerfilModel.codigo == "GERENTE",
            )
        )
        return (await self.session.execute(stmt)).first() is not None

    async def perfil_atribuivel(self, unidade_id: UUID, perfil_id: UUID) -> bool:
        stmt = select(PerfilModel.id).where(
            PerfilModel.id == perfil_id,
            PerfilModel.unidade_id == unidade_id,
            or_(PerfilModel.codigo.is_(None), PerfilModel.codigo != "ADMIN_UNIDADE"),
        )
        return (await self.session.execute(stmt)).first() is not None

    async def listar_ativos_da_unidade(self, unidade_id: UUID) -> list[Usuario]:
        stmt = (
            select(UsuarioModel)
            .join(PerfilModel, PerfilModel.id == UsuarioModel.perfil_id)
            .where(
                UsuarioModel.unidade_id == unidade_id,
                UsuarioModel.ativo.is_(True),
                PerfilModel.unidade_id == unidade_id,
                or_(PerfilModel.codigo.is_(None), PerfilModel.codigo != "ADMIN_UNIDADE"),
            )
            .order_by(UsuarioModel.nome, UsuarioModel.id)
        )
        models = (await self.session.execute(stmt)).scalars().all()
        return [self._to_entity(model) for model in models]

    async def dados_por_usuarios(
        self, unidade_id: UUID, usuario_ids: tuple[UUID, ...]
    ) -> dict[UUID, tuple[str, str, str | None]]:
        if not usuario_ids:
            return {}
        stmt = (
            select(UsuarioModel.id, UsuarioModel.nome, PerfilModel.nome, PerfilModel.codigo)
            .join(PerfilModel, PerfilModel.id == UsuarioModel.perfil_id)
            .where(
                UsuarioModel.unidade_id == unidade_id,
                UsuarioModel.id.in_(usuario_ids),
                PerfilModel.unidade_id == unidade_id,
            )
        )
        return {
            usuario_id: (usuario_nome, perfil_nome, perfil_codigo)
            for usuario_id, usuario_nome, perfil_nome, perfil_codigo in (await self.session.execute(stmt)).all()
        }

    async def listar_filtrado(
        self,
        unidade_id: UUID,
        page: int,
        page_size: int,
        nome: str | None = None,
        email: str | None = None,
        ativo: bool | None = None,
        perfil_id: UUID | None = None,
    ) -> PagedResult[Usuario]:
        filtros = self._filtros(nome, email, ativo, perfil_id)
        filtros.insert(0, UsuarioModel.unidade_id == unidade_id)
        total = (
            await self.session.execute(
                select(func.count()).select_from(UsuarioModel).where(*filtros)
            )
        ).scalar_one()
        stmt = (
            select(UsuarioModel)
            .where(*filtros)
            .order_by(UsuarioModel.nome, UsuarioModel.id)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        models = (await self.session.execute(stmt)).scalars().all()
        return PagedResult([self._to_entity(model) for model in models], page, page_size, total)

    async def listar_visiveis_filtrado(
        self,
        unidade_id: UUID,
        page: int,
        page_size: int,
        time_ids: tuple[UUID, ...],
        usuario_atual_id: UUID,
        nome: str | None = None,
        email: str | None = None,
        ativo: bool | None = None,
        perfil_id: UUID | None = None,
        responsavel_id: UUID | None = None,
    ) -> PagedResult[Usuario]:
        consultas = [
            select(UsuarioModel.id.label("usuario_id")).where(UsuarioModel.id == usuario_atual_id)
        ]
        if responsavel_id is not None:
            consultas.append(
                select(UsuarioModel.id.label("usuario_id")).where(
                    UsuarioModel.unidade_id == unidade_id,
                    UsuarioModel.responsavel_id == responsavel_id,
                )
            )
        if time_ids:
            consultas.append(
                select(TimeMembroModel.usuario_id.label("usuario_id")).where(
                    TimeMembroModel.unidade_id == unidade_id,
                    TimeMembroModel.ativo.is_(True),
                    TimeMembroModel.time_id.in_(time_ids),
                )
            )
        visible_ids = union(*consultas)
        filtros = [
            UsuarioModel.unidade_id == unidade_id,
            UsuarioModel.id.in_(visible_ids),
            *self._filtros(nome, email, ativo, perfil_id),
        ]
        total = (
            await self.session.execute(
                select(func.count()).select_from(UsuarioModel).where(*filtros)
            )
        ).scalar_one()
        stmt = (
            select(UsuarioModel)
            .where(*filtros)
            .order_by(UsuarioModel.nome, UsuarioModel.id)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        models = (await self.session.execute(stmt)).scalars().all()
        return PagedResult([self._to_entity(model) for model in models], page, page_size, total)

    @staticmethod
    def _filtros(
        nome: str | None,
        email: str | None,
        ativo: bool | None,
        perfil_id: UUID | None,
    ):
        filtros = []
        if nome and nome.strip():
            filtros.append(UsuarioModel.nome.ilike(f"%{nome.strip()}%"))
        if email and email.strip():
            filtros.append(UsuarioModel.email.ilike(f"%{email.strip()}%"))
        if ativo is not None:
            filtros.append(UsuarioModel.ativo.is_(ativo))
        if perfil_id is not None:
            filtros.append(UsuarioModel.perfil_id == perfil_id)
        return filtros

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
        responsavel_id: UUID | None = None,
    ) -> PagedResult[Usuario]:
        consultas = [
            select(UsuarioModel.id.label("usuario_id")).where(UsuarioModel.id == usuario_atual_id)
        ]
        if responsavel_id is not None:
            consultas.append(
                select(UsuarioModel.id.label("usuario_id")).where(
                    UsuarioModel.unidade_id == unidade_id,
                    UsuarioModel.responsavel_id == responsavel_id,
                )
            )
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

    async def pertence_a_responsabilidade(
        self, unidade_id: UUID, usuario_id: UUID, responsavel_id: UUID
    ) -> bool:
        stmt = select(UsuarioModel.id).where(
            UsuarioModel.id == usuario_id,
            UsuarioModel.unidade_id == unidade_id,
            UsuarioModel.responsavel_id == responsavel_id,
        )
        return (await self.session.execute(stmt)).first() is not None

    async def responsavel_gerente_valido(self, unidade_id: UUID, usuario_id: UUID) -> bool:
        return await self.gerente_ativo_na_unidade(unidade_id, usuario_id)

    async def invalidar_sessoes(self, usuario_id: UUID) -> None:
        await self.session.execute(
            update(UsuarioModel)
            .where(UsuarioModel.id == usuario_id)
            .values(auth_version=UsuarioModel.auth_version + 1)
        )

    def _to_entity(self, model: UsuarioModel) -> Usuario:
        usuario = Usuario(model.unidade_id, model.nome, model.email)
        usuario.id = model.id
        usuario.senha_hash = model.senha_hash
        usuario.senha_alteracao_obrigatoria = model.senha_alteracao_obrigatoria
        usuario.perfil_id = model.perfil_id
        usuario.responsavel_id = model.responsavel_id
        usuario.auth_version = model.auth_version
        usuario.definir_idioma_preferido(IdiomaPreferido(model.idioma_preferido or "en"))
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
            senha_alteracao_obrigatoria=entity.senha_alteracao_obrigatoria,
            perfil_id=entity.perfil_id,
            responsavel_id=entity.responsavel_id,
            auth_version=entity.auth_version,
            idioma_preferido=entity.idioma_preferido.value,
            ativo=entity.ativo,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
