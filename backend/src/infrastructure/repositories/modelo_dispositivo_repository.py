from uuid import UUID

from sqlalchemy import func, select

from src.domain.common.paged_result import PagedResult
from src.domain.entities.modelo_dispositivo import ModeloDispositivo
from src.infrastructure.data.models.modelo_dispositivo_model import ModeloDispositivoModel
from src.infrastructure.repositories.repository_base import RepositoryBaseImpl


class ModeloDispositivoRepositoryImpl(
    RepositoryBaseImpl[ModeloDispositivo, ModeloDispositivoModel]
):
    model = ModeloDispositivoModel

    async def listar_paginado(
        self,
        unidade_id: UUID,
        page: int,
        page_size: int,
        ativo: bool | None = None,
        busca: str | None = None,
    ) -> PagedResult[ModeloDispositivo]:
        filtros = [ModeloDispositivoModel.unidade_id == unidade_id]
        if ativo is not None:
            filtros.append(ModeloDispositivoModel.ativo.is_(ativo))
        if busca and busca.strip():
            filtros.append(ModeloDispositivoModel.nome.ilike(f"%{busca.strip()}%"))
        total = (
            await self.session.execute(
                select(func.count()).select_from(ModeloDispositivoModel).where(*filtros)
            )
        ).scalar_one()
        modelos = (
            (
                await self.session.execute(
                    select(ModeloDispositivoModel)
                    .where(*filtros)
                    .order_by(ModeloDispositivoModel.nome, ModeloDispositivoModel.id)
                    .offset((page - 1) * page_size)
                    .limit(page_size)
                )
            )
            .scalars()
            .all()
        )
        return PagedResult([self._to_entity(model) for model in modelos], page, page_size, total)

    async def listar_por_ids(
        self, unidade_id: UUID, ids: tuple[UUID, ...]
    ) -> tuple[ModeloDispositivo, ...]:
        if not ids:
            return ()
        modelos = (
            (
                await self.session.execute(
                    select(ModeloDispositivoModel).where(
                        ModeloDispositivoModel.unidade_id == unidade_id,
                        ModeloDispositivoModel.id.in_(ids),
                        ModeloDispositivoModel.ativo.is_(True),
                    )
                )
            )
            .scalars()
            .all()
        )
        return tuple(self._to_entity(model) for model in modelos)

    async def existe_nome(self, unidade_id: UUID, nome: str, ignorar_id: UUID | None) -> bool:
        stmt = select(ModeloDispositivoModel.id).where(
            ModeloDispositivoModel.unidade_id == unidade_id,
            ModeloDispositivoModel.nome == nome.strip(),
        )
        if ignorar_id is not None:
            stmt = stmt.where(ModeloDispositivoModel.id != ignorar_id)
        return (await self.session.execute(stmt)).first() is not None

    def _to_entity(self, model: ModeloDispositivoModel) -> ModeloDispositivo:
        modelo = ModeloDispositivo(model.unidade_id, model.nome, model.descricao)
        modelo.id = model.id
        modelo.ativo = model.ativo
        modelo.created_at = model.created_at
        modelo.updated_at = model.updated_at
        return modelo

    def _to_model(self, entity: ModeloDispositivo) -> ModeloDispositivoModel:
        return ModeloDispositivoModel(
            id=entity.id,
            unidade_id=entity.unidade_id,
            nome=entity.nome,
            descricao=entity.descricao,
            ativo=entity.ativo,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
