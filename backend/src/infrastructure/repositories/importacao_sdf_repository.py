from uuid import UUID

from sqlalchemy import select

from src.domain.entities.importacao_sdf import ImportacaoSdf
from src.infrastructure.data.models.importacao_sdf_model import ImportacaoSdfModel
from src.infrastructure.repositories.repository_base import RepositoryBaseImpl


class ImportacaoSdfRepositoryImpl(RepositoryBaseImpl[ImportacaoSdf, ImportacaoSdfModel]):
    model = ImportacaoSdfModel

    async def listar_por_projeto(
        self, unidade_id: UUID, projeto_id: UUID
    ) -> tuple[ImportacaoSdf, ...]:
        modelos = (
            (
                await self.session.execute(
                    select(ImportacaoSdfModel)
                    .where(
                        ImportacaoSdfModel.unidade_id == unidade_id,
                        ImportacaoSdfModel.projeto_id == projeto_id,
                    )
                    .order_by(ImportacaoSdfModel.created_at.desc(), ImportacaoSdfModel.id)
                )
            )
            .scalars()
            .all()
        )
        return tuple(self._to_entity(modelo) for modelo in modelos)

    def _to_entity(self, model: ImportacaoSdfModel) -> ImportacaoSdf:
        importacao = ImportacaoSdf(model.unidade_id, model.projeto_id, model.importado_por)
        importacao.id = model.id
        importacao.ativo = model.ativo
        importacao.created_at = model.created_at
        importacao.updated_at = model.updated_at
        return importacao

    def _to_model(self, entity: ImportacaoSdf) -> ImportacaoSdfModel:
        return ImportacaoSdfModel(
            id=entity.id,
            unidade_id=entity.unidade_id,
            projeto_id=entity.projeto_id,
            importado_por=entity.importado_por,
            ativo=entity.ativo,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
