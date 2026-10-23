from uuid import UUID

from sqlalchemy import select

from src.domain.entities.resultado_form_factor import ResultadoFormFactor
from src.infrastructure.data.models.resultado_form_factor_model import ResultadoFormFactorModel
from src.infrastructure.repositories.repository_base import RepositoryBaseImpl


class ResultadoFormFactorRepositoryImpl(
    RepositoryBaseImpl[ResultadoFormFactor, ResultadoFormFactorModel]
):
    model = ResultadoFormFactorModel

    async def listar_por_execucao(
        self, unidade_id: UUID, execucao_sdf_id: UUID
    ) -> tuple[ResultadoFormFactor, ...]:
        modelos = (
            (
                await self.session.execute(
                    select(ResultadoFormFactorModel)
                    .where(
                        ResultadoFormFactorModel.unidade_id == unidade_id,
                        ResultadoFormFactorModel.execucao_sdf_id == execucao_sdf_id,
                    )
                    .order_by(ResultadoFormFactorModel.modelo_dispositivo_id)
                )
            )
            .scalars()
            .all()
        )
        return tuple(self._to_entity(modelo) for modelo in modelos)

    def _to_entity(self, model: ResultadoFormFactorModel) -> ResultadoFormFactor:
        resultado = ResultadoFormFactor(
            model.unidade_id,
            model.execucao_sdf_id,
            model.modelo_dispositivo_id,
            model.resultado,
        )
        resultado.id = model.id
        resultado.ativo = model.ativo
        resultado.created_at = model.created_at
        resultado.updated_at = model.updated_at
        return resultado

    def _to_model(self, entity: ResultadoFormFactor) -> ResultadoFormFactorModel:
        return ResultadoFormFactorModel(
            id=entity.id,
            unidade_id=entity.unidade_id,
            execucao_sdf_id=entity.execucao_sdf_id,
            modelo_dispositivo_id=entity.modelo_dispositivo_id,
            resultado=entity.resultado,
            ativo=entity.ativo,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
