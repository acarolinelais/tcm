from src.domain.entities.setor import Setor
from src.infrastructure.data.models.setor_model import SetorModel
from src.infrastructure.repositories.repository_base import RepositoryBaseImpl


class SetorRepositoryImpl(RepositoryBaseImpl[Setor, SetorModel]):
    model = SetorModel

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
