from collections.abc import Sequence
from datetime import datetime
from uuid import UUID

from sqlalchemy import case, func, or_, select

from src.domain.common.paged_result import PagedResult
from src.domain.entities.caso_teste import (
    CasoTeste,
    CategoriaCasoTeste,
    DificuldadeCasoTeste,
    NivelAutomacaoCasoTeste,
    SituacaoCasoTeste,
    StatusCasoTeste,
)
from src.infrastructure.data.models.caso_teste_model import CasoTesteModel
from src.infrastructure.repositories.repository_base import RepositoryBaseImpl


class CasoTesteRepositoryImpl(RepositoryBaseImpl[CasoTeste, CasoTesteModel]):
    model = CasoTesteModel

    async def listar_por_projeto(
        self,
        unidade_id: UUID,
        projeto_id: UUID,
        page: int,
        page_size: int,
        responsavel_ids: Sequence[UUID] | None = None,
        priorizar_responsavel_id: UUID | None = None,
        associado_usuario_id: UUID | None = None,
        data_final_inicio: datetime | None = None,
        data_final_fim: datetime | None = None,
    ) -> PagedResult[CasoTeste]:
        filtros = [
            CasoTesteModel.unidade_id == unidade_id,
            CasoTesteModel.projeto_id == projeto_id,
        ]
        if responsavel_ids:
            filtros.append(CasoTesteModel.responsavel_id.in_(responsavel_ids))
        if data_final_inicio is not None and data_final_fim is not None:
            data_final = func.coalesce(CasoTesteModel.updated_at, CasoTesteModel.created_at)
            filtros.extend(
                (
                    CasoTesteModel.ativo.is_(True),
                    CasoTesteModel.status.in_((StatusCasoTeste.DONE.value, "Pass")),
                    data_final >= data_final_inicio,
                    data_final < data_final_fim,
                )
            )
        if associado_usuario_id is not None:
            filtros.extend(
                (
                    CasoTesteModel.ativo.is_(True),
                    or_(
                        CasoTesteModel.responsavel_id == associado_usuario_id,
                        CasoTesteModel.backup_id == associado_usuario_id,
                    ),
                )
            )
        total = (
            await self.session.execute(
                select(func.count()).select_from(CasoTesteModel).where(*filtros)
            )
        ).scalar_one()
        ordenacao = [CasoTesteModel.tc_id, CasoTesteModel.id]
        if priorizar_responsavel_id is not None:
            # Casos em que o usuário é o responsável principal vêm primeiro; ser backup não conta.
            ordenacao.insert(
                0, case((CasoTesteModel.responsavel_id == priorizar_responsavel_id, 0), else_=1)
            )
        modelos = (
            (
                await self.session.execute(
                    select(CasoTesteModel)
                    .where(*filtros)
                    .order_by(*ordenacao)
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

    async def obter_por_projeto_tc_id(
        self, unidade_id: UUID, projeto_id: UUID, tc_id: str
    ) -> CasoTeste | None:
        modelo = (
            await self.session.execute(
                select(CasoTesteModel).where(
                    CasoTesteModel.unidade_id == unidade_id,
                    CasoTesteModel.projeto_id == projeto_id,
                    CasoTesteModel.tc_id == tc_id,
                    CasoTesteModel.ativo.is_(True),
                )
            )
        ).scalar_one_or_none()
        return self._to_entity(modelo) if modelo is not None else None

    async def listar_em_validacao(
        self, unidade_id: UUID, projeto_id: UUID
    ) -> tuple[CasoTeste, ...]:
        modelos = (
            (
                await self.session.execute(
                    select(CasoTesteModel)
                    .where(
                        CasoTesteModel.unidade_id == unidade_id,
                        CasoTesteModel.projeto_id == projeto_id,
                        CasoTesteModel.ativo.is_(True),
                        CasoTesteModel.status == StatusCasoTeste.IN_VALIDATION.value,
                    )
                    .order_by(CasoTesteModel.tc_id, CasoTesteModel.id)
                )
            )
            .scalars()
            .all()
        )
        return tuple(self._to_entity(modelo) for modelo in modelos)

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
            StatusCasoTeste(model.status),
            exigir_backup=False,
            automation_level=(
                None
                if model.automation_level is None
                else NivelAutomacaoCasoTeste(model.automation_level)
            ),
            justificativa_exclusao=model.justificativa_exclusao,
            title=model.title,
            precondition=model.precondition,
            procedure=model.procedure,
            expected_result=model.expected_result,
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
            automation_level=(
                None if entity.automation_level is None else entity.automation_level.value
            ),
            situation=entity.situation.value,
            status=entity.status.value,
            responsavel_id=entity.responsavel_id,
            backup_id=entity.backup_id,
            justificativa_exclusao=entity.justificativa_exclusao,
            title=entity.title,
            precondition=entity.precondition,
            procedure=entity.procedure,
            expected_result=entity.expected_result,
            ativo=entity.ativo,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
