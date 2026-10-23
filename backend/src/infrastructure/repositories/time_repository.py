from src.domain.entities.time import Time
from src.infrastructure.data.models.time_model import TimeModel
from src.infrastructure.repositories.repository_base import RepositoryBaseImpl


class TimeRepositoryImpl(RepositoryBaseImpl[Time, TimeModel]):
    model = TimeModel

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
