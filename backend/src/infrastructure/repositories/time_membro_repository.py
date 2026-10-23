from uuid import UUID

from sqlalchemy import select

from src.domain.entities.time_membro import TimeMembro
from src.infrastructure.data.models.time_membro_model import TimeMembroModel
from src.infrastructure.repositories.repository_base import RepositoryBaseImpl


class TimeMembroRepositoryImpl(RepositoryBaseImpl[TimeMembro, TimeMembroModel]):
    model = TimeMembroModel

    async def listar_por_time(self, unidade_id: UUID, time_id: UUID) -> list[TimeMembro]:
        stmt = (
            select(TimeMembroModel)
            .where(
                TimeMembroModel.unidade_id == unidade_id,
                TimeMembroModel.time_id == time_id,
                TimeMembroModel.ativo.is_(True),
            )
            .order_by(TimeMembroModel.created_at)
        )
        models = (await self.session.execute(stmt)).scalars().all()
        return [self._to_entity(model) for model in models]

    async def obter_por_time_e_usuario(
        self, unidade_id: UUID, time_id: UUID, usuario_id: UUID
    ) -> TimeMembro | None:
        stmt = select(TimeMembroModel).where(
            TimeMembroModel.unidade_id == unidade_id,
            TimeMembroModel.time_id == time_id,
            TimeMembroModel.usuario_id == usuario_id,
        )
        model = (await self.session.execute(stmt)).scalar_one_or_none()
        return self._to_entity(model) if model is not None else None

    def _to_entity(self, model: TimeMembroModel) -> TimeMembro:
        membro = TimeMembro(model.unidade_id, model.time_id, model.usuario_id)
        membro.id = model.id
        membro.ativo = model.ativo
        membro.created_at = model.created_at
        membro.updated_at = model.updated_at
        return membro

    def _to_model(self, entity: TimeMembro) -> TimeMembroModel:
        return TimeMembroModel(
            id=entity.id,
            unidade_id=entity.unidade_id,
            time_id=entity.time_id,
            usuario_id=entity.usuario_id,
            ativo=entity.ativo,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
