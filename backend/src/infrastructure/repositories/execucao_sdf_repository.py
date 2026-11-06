from uuid import UUID

from sqlalchemy import select

from src.domain.entities.execucao_sdf import ExecucaoSdf
from src.infrastructure.data.models.execucao_sdf_model import ExecucaoSdfModel
from src.infrastructure.repositories.repository_base import RepositoryBaseImpl


class ExecucaoSdfRepositoryImpl(RepositoryBaseImpl[ExecucaoSdf, ExecucaoSdfModel]):
    model = ExecucaoSdfModel

    async def listar_por_importacao(
        self, unidade_id: UUID, importacao_sdf_id: UUID
    ) -> tuple[ExecucaoSdf, ...]:
        modelos = (
            (
                await self.session.execute(
                    select(ExecucaoSdfModel)
                    .where(
                        ExecucaoSdfModel.unidade_id == unidade_id,
                        ExecucaoSdfModel.importacao_sdf_id == importacao_sdf_id,
                    )
                    .order_by(ExecucaoSdfModel.data_reportada, ExecucaoSdfModel.id)
                )
            )
            .scalars()
            .all()
        )
        return tuple(self._to_entity(modelo) for modelo in modelos)

    def _to_entity(self, model: ExecucaoSdfModel) -> ExecucaoSdf:
        execucao = ExecucaoSdf(
            model.unidade_id,
            model.importacao_sdf_id,
            model.caso_teste_id,
            model.sdf_id,
            model.data_reportada,
            model.one_ui,
        )
        execucao.id = model.id
        execucao.ativo = model.ativo
        execucao.created_at = model.created_at
        execucao.updated_at = model.updated_at
        return execucao

    def _to_model(self, entity: ExecucaoSdf) -> ExecucaoSdfModel:
        return ExecucaoSdfModel(
            id=entity.id,
            unidade_id=entity.unidade_id,
            importacao_sdf_id=entity.importacao_sdf_id,
            caso_teste_id=entity.caso_teste_id,
            sdf_id=entity.sdf_id,
            data_reportada=entity.data_reportada,
            one_ui=entity.one_ui,
            ativo=entity.ativo,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
