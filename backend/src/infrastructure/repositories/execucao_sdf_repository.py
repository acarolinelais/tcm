from uuid import UUID

from sqlalchemy import select

from src.domain.entities.execucao_sdf import ExecucaoSdf
from src.infrastructure.data.models.execucao_sdf_model import ExecucaoSdfModel
from src.infrastructure.data.models.rodada_form_factor_model import RodadaFormFactorModel
from src.infrastructure.repositories.repository_base import RepositoryBaseImpl


# RN-13 da spec 022: a rodada atual de um caso é a da sua execução de rodada mais recente.
# Estas duas funções são a única definição dessa regra; o Resumo do Form Factor e o registro
# de resultados as usam.
def filtros_execucao_de_rodada_ativa(execucao, unidade_id: UUID):
    """Execução ativa de uma rodada ativa; a consulta faz o join com `RodadaFormFactorModel`."""
    return (
        execucao.unidade_id == unidade_id,
        execucao.ativo.is_(True),
        RodadaFormFactorModel.unidade_id == unidade_id,
        RodadaFormFactorModel.ativo.is_(True),
    )


def ordem_rodada_atual(execucao):
    """Mais recente primeiro: a primeira execução de rodada do caso nessa ordem é a atual."""
    return (execucao.data_reportada.desc(), execucao.id)


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

    async def obter_por_rodada_e_caso(
        self, unidade_id: UUID, rodada_id: UUID, caso_teste_id: UUID
    ) -> ExecucaoSdf | None:
        modelo = (
            await self.session.execute(
                select(ExecucaoSdfModel).where(
                    ExecucaoSdfModel.unidade_id == unidade_id,
                    ExecucaoSdfModel.rodada_id == rodada_id,
                    ExecucaoSdfModel.caso_teste_id == caso_teste_id,
                    ExecucaoSdfModel.ativo.is_(True),
                )
            )
        ).scalar_one_or_none()
        return self._to_entity(modelo) if modelo is not None else None

    async def obter_rodada_atual_do_caso(
        self, unidade_id: UUID, caso_teste_id: UUID
    ) -> UUID | None:
        return (
            await self.session.execute(
                select(ExecucaoSdfModel.rodada_id)
                .join(RodadaFormFactorModel, RodadaFormFactorModel.id == ExecucaoSdfModel.rodada_id)
                .where(
                    ExecucaoSdfModel.caso_teste_id == caso_teste_id,
                    *filtros_execucao_de_rodada_ativa(ExecucaoSdfModel, unidade_id),
                )
                .order_by(*ordem_rodada_atual(ExecucaoSdfModel))
                .limit(1)
            )
        ).scalar_one_or_none()

    def _to_entity(self, model: ExecucaoSdfModel) -> ExecucaoSdf:
        execucao = ExecucaoSdf(
            model.unidade_id,
            model.importacao_sdf_id,
            model.caso_teste_id,
            model.sdf_id,
            model.data_reportada,
            model.one_ui,
            model.origem,
            model.rodada_id,
            model.resultados_registrados,
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
            origem=entity.origem,
            rodada_id=entity.rodada_id,
            resultados_registrados=entity.resultados_registrados,
            ativo=entity.ativo,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
