from uuid import UUID

from sqlalchemy import func, or_, select

from src.domain.common.paged_result import PagedResult
from src.domain.entities.projeto import Projeto, StatusProjeto
from src.infrastructure.data.models.caso_teste_model import CasoTesteModel
from src.infrastructure.data.models.projeto_model import ProjetoModel
from src.infrastructure.repositories.repository_base import RepositoryBaseImpl


class ProjetoRepositoryImpl(RepositoryBaseImpl[Projeto, ProjetoModel]):
    model = ProjetoModel

    async def listar_associados_por_times(
        self,
        unidade_id: UUID,
        time_ids: tuple[UUID, ...] | None,
        usuario_id: UUID,
        page: int,
        page_size: int,
    ) -> PagedResult[Projeto]:
        if time_ids == ():
            return PagedResult([], page, page_size, 0)
        associado = (
            select(CasoTesteModel.id)
            .where(
                CasoTesteModel.unidade_id == unidade_id,
                CasoTesteModel.projeto_id == ProjetoModel.id,
                CasoTesteModel.ativo.is_(True),
                or_(
                    CasoTesteModel.responsavel_id == usuario_id,
                    CasoTesteModel.backup_id == usuario_id,
                ),
            )
            .exists()
        )
        filtros = (
            ProjetoModel.unidade_id == unidade_id,
            ProjetoModel.ativo.is_(True),
            ProjetoModel.time_id.in_(time_ids) if time_ids is not None else True,
            associado,
        )
        total = (
            await self.session.execute(
                select(func.count()).select_from(ProjetoModel).where(*filtros)
            )
        ).scalar_one()
        modelos = (
            (
                await self.session.execute(
                    select(ProjetoModel)
                    .where(*filtros)
                    .order_by(ProjetoModel.created_at.desc(), ProjetoModel.id)
                    .offset((page - 1) * page_size)
                    .limit(page_size)
                )
            )
            .scalars()
            .all()
        )
        return PagedResult([self._to_entity(model) for model in modelos], page, page_size, total)

    async def adicionar(self, entity: Projeto) -> None:
        # A importação adiciona Projeto e Test Cases na mesma unidade de trabalho, mas
        # não há relacionamento ORM entre as entidades para ordenar o flush automaticamente.
        # Persista o projeto primeiro para que as linhas de Test Case encontrem a FK.
        self.session.add(self._to_model(entity))
        await self.session.flush()

    async def listar_por_times(
        self,
        unidade_id: UUID,
        time_ids: tuple[UUID, ...],
        page: int,
        page_size: int,
    ) -> PagedResult[Projeto]:
        if not time_ids:
            return PagedResult([], page, page_size, 0)
        filtros = [ProjetoModel.unidade_id == unidade_id, ProjetoModel.ativo.is_(True)]
        filtros.append(ProjetoModel.time_id.in_(time_ids))
        total = (
            await self.session.execute(
                select(func.count()).select_from(ProjetoModel).where(*filtros)
            )
        ).scalar_one()
        modelos = (
            (
                await self.session.execute(
                    select(ProjetoModel)
                    .where(*filtros)
                    .order_by(ProjetoModel.created_at.desc(), ProjetoModel.id)
                    .offset((page - 1) * page_size)
                    .limit(page_size)
                )
            )
            .scalars()
            .all()
        )
        return PagedResult([self._to_entity(model) for model in modelos], page, page_size, total)

    async def listar_paginado(
        self, unidade_id: UUID, page: int, page_size: int
    ) -> PagedResult[Projeto]:
        filtros = (ProjetoModel.unidade_id == unidade_id, ProjetoModel.ativo.is_(True))
        total = (
            await self.session.execute(
                select(func.count()).select_from(ProjetoModel).where(*filtros)
            )
        ).scalar_one()
        modelos = (
            (
                await self.session.execute(
                    select(ProjetoModel)
                    .where(*filtros)
                    .order_by(ProjetoModel.created_at.desc(), ProjetoModel.id)
                    .offset((page - 1) * page_size)
                    .limit(page_size)
                )
            )
            .scalars()
            .all()
        )
        return PagedResult([self._to_entity(model) for model in modelos], page, page_size, total)

    async def desativar(self, unidade_id: UUID, projeto_id: UUID) -> None:
        model = (
            await self.session.execute(
                select(ProjetoModel).where(
                    ProjetoModel.unidade_id == unidade_id, ProjetoModel.id == projeto_id
                )
            )
        ).scalar_one_or_none()
        if model is not None:
            model.ativo = False

    def _to_entity(self, model: ProjetoModel) -> Projeto:
        projeto = Projeto(model.unidade_id, model.time_id, model.app, model.one_ui)
        projeto.id = model.id
        projeto.ativo = model.ativo
        projeto.status = StatusProjeto(model.status)
        projeto.created_at = model.created_at
        projeto.updated_at = model.updated_at
        return projeto

    def _to_model(self, entity: Projeto) -> ProjetoModel:
        return ProjetoModel(
            id=entity.id,
            unidade_id=entity.unidade_id,
            time_id=entity.time_id,
            app=entity.app,
            one_ui=entity.one_ui,
            status=entity.status.value,
            ativo=entity.ativo,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
