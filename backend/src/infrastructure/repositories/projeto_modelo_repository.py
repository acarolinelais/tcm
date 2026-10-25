from uuid import UUID

from sqlalchemy import select

from src.domain.entities.projeto_modelo import ProjetoModelo
from src.infrastructure.data.models.projeto_modelo_model import ProjetoModeloModel
from src.infrastructure.repositories.repository_base import RepositoryBaseImpl


class ProjetoModeloRepositoryImpl(RepositoryBaseImpl[ProjetoModelo, ProjetoModeloModel]):
    model = ProjetoModeloModel

    async def listar_por_projeto(
        self, unidade_id: UUID, projeto_id: UUID
    ) -> tuple[ProjetoModelo, ...]:
        modelos = (
            (
                await self.session.execute(
                    select(ProjetoModeloModel).where(
                        ProjetoModeloModel.unidade_id == unidade_id,
                        ProjetoModeloModel.projeto_id == projeto_id,
                        ProjetoModeloModel.ativo.is_(True),
                    )
                )
            )
            .scalars()
            .all()
        )
        return tuple(self._to_entity(model) for model in modelos)

    def _to_entity(self, model: ProjetoModeloModel) -> ProjetoModelo:
        vinculo = ProjetoModelo(model.unidade_id, model.projeto_id, model.modelo_dispositivo_id)
        vinculo.id = model.id
        vinculo.ativo = model.ativo
        vinculo.created_at = model.created_at
        vinculo.updated_at = model.updated_at
        return vinculo

    def _to_model(self, entity: ProjetoModelo) -> ProjetoModeloModel:
        return ProjetoModeloModel(
            id=entity.id,
            unidade_id=entity.unidade_id,
            projeto_id=entity.projeto_id,
            modelo_dispositivo_id=entity.modelo_dispositivo_id,
            ativo=entity.ativo,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
