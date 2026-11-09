from uuid import UUID

from sqlalchemy import exists, func, select

from src.domain.common.paged_result import PagedResult
from src.domain.entities.rodada_form_factor import RodadaFormFactor
from src.domain.queries.rodada_form_factor_caso import RodadaFormFactorCaso
from src.infrastructure.data.models.caso_teste_model import CasoTesteModel
from src.infrastructure.data.models.execucao_sdf_model import ExecucaoSdfModel
from src.infrastructure.data.models.resultado_form_factor_model import ResultadoFormFactorModel
from src.infrastructure.data.models.rodada_form_factor_model import RodadaFormFactorModel
from src.infrastructure.repositories.repository_base import RepositoryBaseImpl


class RodadaFormFactorRepositoryImpl(RepositoryBaseImpl[RodadaFormFactor, RodadaFormFactorModel]):
    model = RodadaFormFactorModel

    async def adicionar(self, entity: RodadaFormFactor) -> None:
        self.session.add(self._to_model(entity))
        await self.session.flush()

    async def obter_no_projeto(
        self, unidade_id: UUID, projeto_id: UUID, rodada_id: UUID
    ) -> RodadaFormFactor | None:
        model = (
            await self.session.execute(
                select(RodadaFormFactorModel).where(
                    RodadaFormFactorModel.id == rodada_id,
                    RodadaFormFactorModel.unidade_id == unidade_id,
                    RodadaFormFactorModel.projeto_id == projeto_id,
                    RodadaFormFactorModel.ativo.is_(True),
                )
            )
        ).scalar_one_or_none()
        return self._to_entity(model) if model is not None else None

    async def existe_sdf_id_no_projeto(
        self, unidade_id: UUID, projeto_id: UUID, sdf_id: str
    ) -> bool:
        # Ignora maiúsculas e espaços nas pontas (rodadas antigas podem ter sido gravadas assim).
        # O lower dos dois lados é o do Postgres, para a colação valer igual.
        return (
            await self.session.execute(
                select(
                    exists().where(
                        RodadaFormFactorModel.unidade_id == unidade_id,
                        RodadaFormFactorModel.projeto_id == projeto_id,
                        RodadaFormFactorModel.ativo.is_(True),
                        func.lower(func.trim(RodadaFormFactorModel.sdf_id)) == func.lower(sdf_id),
                    )
                )
            )
        ).scalar_one()

    async def listar_casos(
        self,
        unidade_id: UUID,
        projeto_id: UUID,
        rodada_id: UUID,
        page: int,
        page_size: int,
    ) -> PagedResult[RodadaFormFactorCaso]:
        filtros = (
            ExecucaoSdfModel.unidade_id == unidade_id,
            ExecucaoSdfModel.rodada_id == rodada_id,
            ExecucaoSdfModel.ativo.is_(True),
            CasoTesteModel.unidade_id == unidade_id,
            CasoTesteModel.projeto_id == projeto_id,
            CasoTesteModel.ativo.is_(True),
        )
        total = (
            await self.session.execute(
                select(func.count(ExecucaoSdfModel.id))
                .join(CasoTesteModel, CasoTesteModel.id == ExecucaoSdfModel.caso_teste_id)
                .where(*filtros)
            )
        ).scalar_one()
        execucoes = (
            await self.session.execute(
                select(
                    ExecucaoSdfModel.id,
                    CasoTesteModel.id.label("caso_teste_id"),
                    CasoTesteModel.tc_id,
                    CasoTesteModel.responsavel_id,
                    CasoTesteModel.backup_id,
                    CasoTesteModel.status,
                    ExecucaoSdfModel.resultados_registrados,
                )
                .join(CasoTesteModel, CasoTesteModel.id == ExecucaoSdfModel.caso_teste_id)
                .where(*filtros)
                .order_by(CasoTesteModel.tc_id, CasoTesteModel.id)
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
        ).all()
        execucao_ids = tuple(row.id for row in execucoes)
        resultados: dict[UUID, dict[UUID, str]] = {id_: {} for id_ in execucao_ids}
        if execucao_ids:
            linhas = (
                await self.session.execute(
                    select(
                        ResultadoFormFactorModel.execucao_sdf_id,
                        ResultadoFormFactorModel.modelo_dispositivo_id,
                        ResultadoFormFactorModel.resultado,
                    ).where(
                        ResultadoFormFactorModel.unidade_id == unidade_id,
                        ResultadoFormFactorModel.execucao_sdf_id.in_(execucao_ids),
                        ResultadoFormFactorModel.ativo.is_(True),
                    )
                )
            ).all()
            for linha in linhas:
                resultados[linha.execucao_sdf_id][linha.modelo_dispositivo_id] = linha.resultado
        items = [
            RodadaFormFactorCaso(
                execucao_id=row.id,
                caso_teste_id=row.caso_teste_id,
                tc_id=row.tc_id,
                responsavel_id=row.responsavel_id,
                backup_id=row.backup_id,
                status=row.status,
                resultados=resultados[row.id],
                resultados_registrados=row.resultados_registrados,
            )
            for row in execucoes
        ]
        return PagedResult(items, page, page_size, total)

    def _to_entity(self, model: RodadaFormFactorModel) -> RodadaFormFactor:
        rodada = RodadaFormFactor(
            model.unidade_id, model.projeto_id, model.criada_por, model.sdf_id, model.created_at
        )
        rodada.id = model.id
        rodada.ativo = model.ativo
        return rodada

    def _to_model(self, entity: RodadaFormFactor) -> RodadaFormFactorModel:
        return RodadaFormFactorModel(
            id=entity.id,
            unidade_id=entity.unidade_id,
            projeto_id=entity.projeto_id,
            criada_por=entity.criada_por,
            sdf_id=entity.sdf_id,
            created_at=entity.created_at,
            ativo=entity.ativo,
        )
