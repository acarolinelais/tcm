from uuid import UUID

from sqlalchemy import func, select

from src.domain.common.paged_result import PagedResult
from src.domain.entities.time import Time
from src.infrastructure.data.models.time_model import TimeModel
from src.infrastructure.repositories.repository_base import RepositoryBaseImpl


class TimeRepositoryImpl(RepositoryBaseImpl[Time, TimeModel]):
    model = TimeModel

    async def listar_paginado(
        self,
        unidade_id: UUID,
        page: int,
        page_size: int,
        setor_id: UUID | None = None,
        ativo: bool | None = None,
        busca: str | None = None,
    ) -> PagedResult[Time]:
        if setor_id is None and ativo is None and not busca:
            return await super().listar_paginado(unidade_id, page, page_size)
        filtros = [TimeModel.unidade_id == unidade_id]
        if setor_id is not None:
            filtros.append(TimeModel.setor_id == setor_id)
        if ativo is not None:
            filtros.append(TimeModel.ativo.is_(ativo))
        if busca and busca.strip():
            filtros.append(TimeModel.nome.ilike(f"%{busca.strip()}%"))
        total = (
            await self.session.execute(select(func.count()).select_from(TimeModel).where(*filtros))
        ).scalar_one()
        models = (
            (
                await self.session.execute(
                    select(TimeModel).where(*filtros).order_by(TimeModel.nome, TimeModel.id).offset((page - 1) * page_size).limit(page_size)
                )
            )
            .scalars()
            .all()
        )
        return PagedResult([self._to_entity(m) for m in models], page, page_size, total)

    async def listar_visiveis(
        self,
        unidade_id: UUID,
        page: int,
        page_size: int,
        time_ids: tuple[UUID, ...],
        setor_id: UUID | None = None,
        ativo: bool | None = None,
        busca: str | None = None,
    ) -> PagedResult[Time]:
        filtros = [
            TimeModel.unidade_id == unidade_id,
            TimeModel.ativo.is_(True),
            TimeModel.id.in_(time_ids),
        ]
        if setor_id is not None:
            filtros.append(TimeModel.setor_id == setor_id)
        if ativo is not None:
            filtros.append(TimeModel.ativo.is_(ativo))
        if busca and busca.strip():
            filtros.append(TimeModel.nome.ilike(f"%{busca.strip()}%"))
        total = (
            await self.session.execute(select(func.count()).select_from(TimeModel).where(*filtros))
        ).scalar_one()
        models = (
            (
                await self.session.execute(
                    select(TimeModel)
                    .where(*filtros)
                    .order_by(TimeModel.nome, TimeModel.id)
                    .offset((page - 1) * page_size)
                    .limit(page_size)
                )
            )
            .scalars()
            .all()
        )
        return PagedResult([self._to_entity(m) for m in models], page, page_size, total)

    async def listar_por_setores(
        self,
        unidade_id: UUID,
        page: int,
        page_size: int,
        setor_ids: tuple[UUID, ...],
        setor_id: UUID | None = None,
        ativo: bool | None = None,
        busca: str | None = None,
    ) -> PagedResult[Time]:
        filtros = [TimeModel.unidade_id == unidade_id, TimeModel.ativo.is_(True)]
        filtros.append(TimeModel.setor_id.in_(setor_ids) if setor_ids else TimeModel.id.is_(None))
        if setor_id is not None:
            filtros.append(TimeModel.setor_id == setor_id)
        if ativo is not None:
            filtros.append(TimeModel.ativo.is_(ativo))
        if busca and busca.strip():
            filtros.append(TimeModel.nome.ilike(f"%{busca.strip()}%"))
        total = (
            await self.session.execute(select(func.count()).select_from(TimeModel).where(*filtros))
        ).scalar_one()
        models = (
            (
                await self.session.execute(
                    select(TimeModel)
                    .where(*filtros)
                    .order_by(TimeModel.nome, TimeModel.id)
                    .offset((page - 1) * page_size)
                    .limit(page_size)
                )
            )
            .scalars()
            .all()
        )
        return PagedResult([self._to_entity(m) for m in models], page, page_size, total)

    async def inativar_setor(self, unidade_id: UUID, setor_id: UUID) -> int:
        from sqlalchemy import update

        result = await self.session.execute(
            update(TimeModel)
            .where(
                TimeModel.unidade_id == unidade_id,
                TimeModel.setor_id == setor_id,
                TimeModel.ativo.is_(True),
            )
            .values(ativo=False)
        )
        return result.rowcount or 0

    def _to_entity(self, model: TimeModel) -> Time:
        time = Time(model.unidade_id, model.setor_id, model.nome, model.gerente_id)
        time.id = model.id
        time.ativo = model.ativo
        time.created_at = model.created_at
        time.updated_at = model.updated_at
        return time

    def _to_model(self, entity: Time) -> TimeModel:
        return TimeModel(
            id=entity.id,
            unidade_id=entity.unidade_id,
            setor_id=entity.setor_id,
            nome=entity.nome,
            gerente_id=entity.gerente_id,
            ativo=entity.ativo,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
