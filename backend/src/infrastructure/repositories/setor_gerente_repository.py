from uuid import UUID

from sqlalchemy import select

from src.domain.entities.setor_gerente import SetorGerente
from src.infrastructure.data.models.setor_gerente_model import SetorGerenteModel
from src.infrastructure.repositories.repository_base import RepositoryBaseImpl


class SetorGerenteRepositoryImpl(RepositoryBaseImpl[SetorGerente, SetorGerenteModel]):
    model = SetorGerenteModel

    async def obter(
        self, unidade_id: UUID, setor_id: UUID, usuario_id: UUID
    ) -> SetorGerente | None:
        stmt = select(self.model).where(
            self.model.unidade_id == unidade_id,
            self.model.setor_id == setor_id,
            self.model.usuario_id == usuario_id,
        )
        model = (await self.session.execute(stmt)).scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def listar_por_setor(
        self, unidade_id: UUID, setor_id: UUID, somente_ativos: bool = True
    ) -> list[SetorGerente]:
        stmt = select(self.model).where(
            self.model.unidade_id == unidade_id,
            self.model.setor_id == setor_id,
        )
        if somente_ativos:
            stmt = stmt.where(self.model.ativo.is_(True))
        models = (await self.session.execute(stmt.order_by(self.model.created_at))).scalars().all()
        return [self._to_entity(model) for model in models]

    async def listar_gerentes(self, unidade_id: UUID, setor_id: UUID) -> list[SetorGerente]:
        return await self.listar_por_setor(unidade_id, setor_id, somente_ativos=False)

    async def inativar_por_setor(self, unidade_id: UUID, setor_id: UUID) -> tuple[UUID, ...]:
        stmt = select(self.model).where(
            self.model.unidade_id == unidade_id,
            self.model.setor_id == setor_id,
            self.model.ativo.is_(True),
        )
        models = (await self.session.execute(stmt)).scalars().all()
        for model in models:
            model.ativo = False
        return tuple(dict.fromkeys(model.usuario_id for model in models))

    async def listar_setores_gerenciados(
        self, unidade_id: UUID, usuario_id: UUID
    ) -> tuple[UUID, ...]:
        stmt = select(self.model.setor_id).where(
            self.model.unidade_id == unidade_id,
            self.model.usuario_id == usuario_id,
            self.model.ativo.is_(True),
        )
        return tuple((await self.session.execute(stmt)).scalars().all())

    async def listar_gerentes_por_setores(
        self, unidade_id: UUID, setor_ids: tuple[UUID, ...]
    ) -> tuple[UUID, ...]:
        if not setor_ids:
            return ()
        stmt = select(self.model.usuario_id).where(
            self.model.unidade_id == unidade_id,
            self.model.setor_id.in_(setor_ids),
            self.model.ativo.is_(True),
        )
        return tuple(dict.fromkeys((await self.session.execute(stmt)).scalars().all()))

    async def gerente_associado(self, unidade_id: UUID, setor_id: UUID, usuario_id: UUID) -> bool:
        stmt = select(self.model.id).where(
            self.model.unidade_id == unidade_id,
            self.model.setor_id == setor_id,
            self.model.usuario_id == usuario_id,
            self.model.ativo.is_(True),
        )
        return (await self.session.execute(stmt)).first() is not None

    def _to_entity(self, model: SetorGerenteModel) -> SetorGerente:
        association = SetorGerente(model.unidade_id, model.setor_id, model.usuario_id)
        association.id = model.id
        association.ativo = model.ativo
        association.created_at = model.created_at
        association.updated_at = model.updated_at
        return association

    def _to_model(self, entity: SetorGerente) -> SetorGerenteModel:
        return SetorGerenteModel(
            id=entity.id,
            unidade_id=entity.unidade_id,
            setor_id=entity.setor_id,
            usuario_id=entity.usuario_id,
            ativo=entity.ativo,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
