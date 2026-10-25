from datetime import datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import distinct_on

from src.domain.common.paged_result import PagedResult
from src.domain.entities.resultado_form_factor import ResultadoFormFactor
from src.domain.queries.form_factor_linha import FormFactorLinha
from src.infrastructure.data.models.caso_teste_model import CasoTesteModel
from src.infrastructure.data.models.execucao_sdf_model import ExecucaoSdfModel
from src.infrastructure.data.models.importacao_sdf_model import ImportacaoSdfModel
from src.infrastructure.data.models.projeto_modelo_model import ProjetoModeloModel
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
        responsavel_id: UUID | None = None,
    ) -> PagedResult[FormFactorLinha]:
        # Resultados que contam: do projeto, em modelo vinculado e, se houver, na semana.
        resultados_validos = (
            select(ResultadoFormFactorModel.id)
            .join(ExecucaoSdfModel, ResultadoFormFactorModel.execucao_sdf_id == ExecucaoSdfModel.id)
            .join(ImportacaoSdfModel, ExecucaoSdfModel.importacao_sdf_id == ImportacaoSdfModel.id)
            .join(
                ProjetoModeloModel,
                (ProjetoModeloModel.projeto_id == projeto_id)
                & (
                    ProjetoModeloModel.modelo_dispositivo_id
                    == ResultadoFormFactorModel.modelo_dispositivo_id
                ),
            )
            .where(
                ResultadoFormFactorModel.unidade_id == unidade_id,
                ExecucaoSdfModel.unidade_id == unidade_id,
                ImportacaoSdfModel.unidade_id == unidade_id,
                ProjetoModeloModel.unidade_id == unidade_id,
                ImportacaoSdfModel.projeto_id == projeto_id,
                ProjetoModeloModel.ativo.is_(True),
                ResultadoFormFactorModel.ativo.is_(True),
                ExecucaoSdfModel.ativo.is_(True),
                ImportacaoSdfModel.ativo.is_(True),
            )
        )
        if inicio is not None:
            resultados_validos = resultados_validos.where(ExecucaoSdfModel.data_reportada >= inicio)
        if fim is not None:
            resultados_validos = resultados_validos.where(ExecucaoSdfModel.data_reportada < fim)

        filtros_caso = [
            CasoTesteModel.unidade_id == unidade_id,
            CasoTesteModel.projeto_id == projeto_id,
            CasoTesteModel.ativo.is_(True),
        ]
        if responsavel_id is not None:
            filtros_caso.append(CasoTesteModel.responsavel_id == responsavel_id)
        if inicio is not None or fim is not None:
            filtros_caso.append(
                resultados_validos.where(
                    ExecucaoSdfModel.caso_teste_id == CasoTesteModel.id
                ).exists()
            )

        total = (
            await self.session.execute(
                select(func.count()).select_from(CasoTesteModel).where(*filtros_caso)
            )
        ).scalar_one()
        casos = (
            await self.session.execute(
                select(CasoTesteModel.id, CasoTesteModel.tc_id, CasoTesteModel.responsavel_id)
                .where(*filtros_caso)
                .order_by(CasoTesteModel.tc_id, CasoTesteModel.id)
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
        ).all()
        if not casos:
            return PagedResult([], page, page_size, total)

        # Resultado mais recente de cada par (caso, modelo); empate vence a importação mais recente,
        # e os ids fecham a ordem para a escolha não variar entre consultas.
        celulas = await self.session.execute(
            resultados_validos.with_only_columns(
                ExecucaoSdfModel.caso_teste_id,
                ResultadoFormFactorModel.modelo_dispositivo_id,
                ResultadoFormFactorModel.resultado,
                ExecucaoSdfModel.sdf_id,
                ExecucaoSdfModel.data_reportada,
                ImportacaoSdfModel.created_at,
            )
            .where(ExecucaoSdfModel.caso_teste_id.in_([caso_id for caso_id, _, _ in casos]))
            .ext(
                distinct_on(
                    ExecucaoSdfModel.caso_teste_id, ResultadoFormFactorModel.modelo_dispositivo_id
                )
            )
            .order_by(
                ExecucaoSdfModel.caso_teste_id,
                ResultadoFormFactorModel.modelo_dispositivo_id,
                ExecucaoSdfModel.data_reportada.desc(),
                ImportacaoSdfModel.created_at.desc(),
                ExecucaoSdfModel.id,
                ResultadoFormFactorModel.id,
            )
        )
        resultados: dict[UUID, dict[UUID, str]] = {}
        # Por caso: ((data reportada, data da importação), SDF ID) da célula mais recente.
        mais_recente: dict[UUID, tuple[tuple[datetime, datetime], str]] = {}
        for caso_id, modelo_id, valor, sdf_id, data_reportada, importado_em in celulas.all():
            resultados.setdefault(caso_id, {})[modelo_id] = valor
            chave = (data_reportada, importado_em)
            if caso_id not in mais_recente or chave > mais_recente[caso_id][0]:
                mais_recente[caso_id] = (chave, sdf_id)

        items = []
        for caso_id, tc_id, responsavel_id_caso in casos:
            recente = mais_recente.get(caso_id)
            items.append(
                FormFactorLinha(
                    caso_teste_id=caso_id,
                    tc_id=tc_id,
                    responsavel_id=responsavel_id_caso,
                    sdf_id=recente[1] if recente else None,
                    data_reportada=recente[0][0] if recente else None,
                    resultados=resultados.get(caso_id, {}),
                )
            )
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
