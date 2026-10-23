from uuid import UUID

from sqlalchemy import func, select

from src.domain.common.paged_result import PagedResult
from src.domain.entities.caso_teste import (
    CasoTeste,
    CategoriaCasoTeste,
    DificuldadeCasoTeste,
    SituacaoCasoTeste,
)
from src.infrastructure.data.models.caso_teste_model import CasoTesteModel
from src.infrastructure.repositories.repository_base import RepositoryBaseImpl


class CasoTesteRepositoryImpl(RepositoryBaseImpl[CasoTeste, CasoTesteModel]):
    model = CasoTesteModel

    async def listar_por_projeto(
        self, unidade_id: UUID, projeto_id: UUID, page: int, page_size: int
    ) -> PagedResult[CasoTeste]:
        filtros = [
            CasoTesteModel.unidade_id == unidade_id,
            CasoTesteModel.projeto_id == projeto_id,
        ]
        total = (
            await self.session.execute(
                select(func.count()).select_from(CasoTesteModel).where(*filtros)
            )
        ).scalar_one()
        modelos = (
            (
                await self.session.execute(
                    select(CasoTesteModel)
                    .where(*filtros)
                    .order_by(CasoTesteModel.tc_id, CasoTesteModel.id)
                    .offset((page - 1) * page_size)
                    .limit(page_size)
                )
            )
            .scalars()
            .all()
        )
        return PagedResult([self._to_entity(modelo) for modelo in modelos], page, page_size, total)

    async def existe_tc_id(self, unidade_id: UUID, projeto_id: UUID, tc_id: str) -> bool:
        encontrado = await self.session.execute(
            select(CasoTesteModel.id)
            .where(
                CasoTesteModel.unidade_id == unidade_id,
                CasoTesteModel.projeto_id == projeto_id,
                CasoTesteModel.tc_id == tc_id,
            )
            .limit(1)
        )
        return encontrado.scalar_one_or_none() is not None

    def _to_entity(self, model: CasoTesteModel) -> CasoTeste:
        caso = CasoTeste(
            model.unidade_id,
            model.projeto_id,
            model.tc_id,
            CategoriaCasoTeste(model.category),
            DificuldadeCasoTeste(model.difficulty),
            model.responsavel_id,
            model.backup_id,
            SituacaoCasoTeste(model.situation),
        )
        caso.id = model.id
        caso.ativo = model.ativo
        caso.created_at = model.created_at
        caso.updated_at = model.updated_at
        return caso

    def _to_model(self, entity: CasoTeste) -> CasoTesteModel:
        return CasoTesteModel(
            id=entity.id,
            unidade_id=entity.unidade_id,
            projeto_id=entity.projeto_id,
            tc_id=entity.tc_id,
            category=entity.category.value,
            difficulty=entity.difficulty.value,
            situation=entity.situation.value,
            responsavel_id=entity.responsavel_id,
            backup_id=entity.backup_id,
            ativo=entity.ativo,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
