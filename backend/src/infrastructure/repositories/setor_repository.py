from uuid import UUID

from sqlalchemy import func, select

from src.domain.common.paged_result import PagedResult
from src.domain.entities.setor import Setor
from src.infrastructure.data.models.setor_model import SetorModel
from src.infrastructure.data.models.time_model import TimeModel
from src.infrastructure.repositories.repository_base import RepositoryBaseImpl


class SetorRepositoryImpl(RepositoryBaseImpl[Setor, SetorModel]):
    model = SetorModel

    async def ids_por_times(self, unidade_id: UUID, time_ids: tuple[UUID, ...]) -> tuple[UUID, ...]:
        if not time_ids:
            return ()
        stmt = (
            select(TimeModel.setor_id)
            .where(TimeModel.unidade_id == unidade_id, TimeModel.id.in_(time_ids))
            .distinct()
        )
        return tuple((await self.session.execute(stmt)).scalars().all())

    async def nomes_por_ids(
        self, unidade_id: UUID, setor_ids: tuple[UUID, ...]
    ) -> dict[UUID, str]:
        if not setor_ids:
            return {}
        stmt = select(SetorModel.id, SetorModel.nome).where(
            SetorModel.unidade_id == unidade_id,
            SetorModel.id.in_(setor_ids),
        )
        return dict((await self.session.execute(stmt)).all())

    async def listar_paginado(
        self,
        unidade_id: UUID,
        page: int,
        page_size: int,
        *,
        ativo: bool | None = None,
        busca: str | None = None,
        setor_ids: tuple[UUID, ...] | None = None,
    ) -> PagedResult[Setor]:
        filtros = [SetorModel.unidade_id == unidade_id]
        if setor_ids is not None:
            filtros.append(SetorModel.id.in_(setor_ids) if setor_ids else SetorModel.id.is_(None))
        if ativo is not None:
            filtros.append(SetorModel.ativo.is_(ativo))
        if busca and busca.strip():
            filtros.append(SetorModel.nome.ilike(f"%{busca.strip()}%"))
        total = (
            await self.session.execute(select(func.count()).select_from(SetorModel).where(*filtros))
        ).scalar_one()
        models = (
            (
                await self.session.execute(
                    select(SetorModel)
                    .where(*filtros)
                    .order_by(SetorModel.nome, SetorModel.id)
                    .offset((page - 1) * page_size)
                    .limit(page_size)
                )
            )
            .scalars()
            .all()
        )
        return PagedResult([self._to_entity(model) for model in models], page, page_size, total)

    async def possui_times_ativos(self, unidade_id: UUID, setor_id: UUID) -> bool:
        stmt = (
            select(func.count())
            .select_from(TimeModel)
            .where(
                TimeModel.unidade_id == unidade_id,
                TimeModel.setor_id == setor_id,
                TimeModel.ativo.is_(True),
            )
        )
        return (await self.session.execute(stmt)).scalar_one() > 0

    def _to_entity(self, model: SetorModel) -> Setor:
        setor = Setor(model.unidade_id, model.nome)
        setor.id = model.id
        setor.ativo = model.ativo
        setor.created_at = model.created_at
        setor.updated_at = model.updated_at
        return setor

    def _to_model(self, entity: Setor) -> SetorModel:
        return SetorModel(
            id=entity.id,
            unidade_id=entity.unidade_id,
            nome=entity.nome,
            ativo=entity.ativo,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
