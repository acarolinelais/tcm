from datetime import datetime
from uuid import UUID

from sqlalchemy import func, select

from src.domain.common.paged_result import PagedResult
from src.domain.entities.resultado_form_factor import ResultadoFormFactor
from src.domain.queries.form_factor_linha import FormFactorLinha
from src.infrastructure.data.models.caso_teste_model import CasoTesteModel
from src.infrastructure.data.models.execucao_sdf_model import ExecucaoSdfModel
from src.infrastructure.data.models.importacao_sdf_model import ImportacaoSdfModel
from src.infrastructure.data.models.modelo_dispositivo_model import ModeloDispositivoModel
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

    async def listar_form_factor_por_projeto(
        self,
        unidade_id: UUID,
        projeto_id: UUID,
        page: int,
        page_size: int,
        inicio: datetime | None = None,
        fim: datetime | None = None,
        one_ui: str | None = None,
    ) -> PagedResult[FormFactorLinha]:
        filtros = [
            ResultadoFormFactorModel.unidade_id == unidade_id,
            ExecucaoSdfModel.unidade_id == unidade_id,
            ImportacaoSdfModel.unidade_id == unidade_id,
            CasoTesteModel.unidade_id == unidade_id,
            ModeloDispositivoModel.unidade_id == unidade_id,
            ImportacaoSdfModel.projeto_id == projeto_id,
        ]
        if inicio is not None:
            filtros.append(ExecucaoSdfModel.data_reportada >= inicio)
        if fim is not None:
            filtros.append(ExecucaoSdfModel.data_reportada < fim)
        if one_ui:
            filtros.append(ExecucaoSdfModel.one_ui == one_ui)
        joins = (
            ResultadoFormFactorModel.__table__.join(
                ExecucaoSdfModel.__table__,
                ResultadoFormFactorModel.execucao_sdf_id == ExecucaoSdfModel.id,
            )
            .join(
                ImportacaoSdfModel.__table__,
                ExecucaoSdfModel.importacao_sdf_id == ImportacaoSdfModel.id,
            )
            .join(CasoTesteModel.__table__, ExecucaoSdfModel.caso_teste_id == CasoTesteModel.id)
            .join(
                ModeloDispositivoModel.__table__,
                ResultadoFormFactorModel.modelo_dispositivo_id == ModeloDispositivoModel.id,
            )
        )
        total = (
            await self.session.execute(select(func.count()).select_from(joins).where(*filtros))
        ).scalar_one()
        resultado = await self.session.execute(
            select(
                CasoTesteModel.tc_id,
                ExecucaoSdfModel.sdf_id,
                ModeloDispositivoModel.id,
                ModeloDispositivoModel.nome,
                ResultadoFormFactorModel.resultado,
                ExecucaoSdfModel.data_reportada,
                ExecucaoSdfModel.one_ui,
            )
            .select_from(joins)
            .where(*filtros)
            .order_by(
                ExecucaoSdfModel.data_reportada.desc(),
                CasoTesteModel.tc_id,
                ModeloDispositivoModel.nome,
            )
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        items = [FormFactorLinha(*row) for row in resultado.all()]
        return PagedResult(items, page, page_size, total)

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
