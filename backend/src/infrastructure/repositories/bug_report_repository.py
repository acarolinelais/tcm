from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.common.paged_result import PagedResult
from src.domain.entities.caso_teste import StatusCasoTeste
from src.domain.entities.projeto import StatusProjeto
from src.domain.queries.bug_report import FalhaAberta, FiltrosBugReport
from src.domain.queries.resumo_overview import EscopoOverview
from src.infrastructure.data.models.caso_teste_model import CasoTesteModel
from src.infrastructure.data.models.execucao_sdf_model import ExecucaoSdfModel
from src.infrastructure.data.models.modelo_dispositivo_model import ModeloDispositivoModel
from src.infrastructure.data.models.projeto_model import ProjetoModel
from src.infrastructure.data.models.resultado_form_factor_model import ResultadoFormFactorModel
from src.infrastructure.data.models.usuario_model import UsuarioModel
from src.infrastructure.repositories.historico_form_factor_repository import (
    _ordem_de_gravacao,
    _resultados_validos,
)


class BugReportRepositoryImpl:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def listar_falhas_abertas(
        self,
        unidade_id: UUID,
        escopo: EscopoOverview,
        filtros: FiltrosBugReport,
        page: int,
        page_size: int,
    ) -> PagedResult[FalhaAberta]:
        ultimos = self._ultimos_resultados(unidade_id, escopo, filtros)
        falhas = select(*(ultimos.c[campo] for campo in FalhaAberta.__dataclass_fields__)).where(
            ultimos.c.posicao == 1, func.upper(func.trim(ultimos.c.resultado)) == "FAIL"
        )
        total = (
            await self.session.execute(select(func.count()).select_from(falhas.subquery()))
        ).scalar_one()
        linhas = await self.session.execute(
            falhas.order_by(ultimos.c.data_execucao.desc(), ultimos.c.tc_id, ultimos.c.modelo_nome)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return PagedResult(
            [FalhaAberta(*linha) for linha in linhas],
            page,
            page_size,
            total,
        )

    @staticmethod
    def _ultimos_resultados(unidade_id: UUID, escopo: EscopoOverview, filtros: FiltrosBugReport):
        """Resultados válidos de cada caso + device no escopo, numerados do mais recente
        (`posicao` 1) com a ordem da End date (spec 065)."""
        # O join com os modelos do projeto vem antes do caso: o projeto sai da execução.
        projeto_do_caso = (
            select(CasoTesteModel.projeto_id)
            .where(CasoTesteModel.id == ExecucaoSdfModel.caso_teste_id)
            .correlate_except(CasoTesteModel)
            .scalar_subquery()
        )
        posicao = (
            func.row_number()
            .over(
                partition_by=(
                    ExecucaoSdfModel.caso_teste_id,
                    ResultadoFormFactorModel.modelo_dispositivo_id,
                ),
                order_by=(
                    ExecucaoSdfModel.data_reportada.desc(),
                    _ordem_de_gravacao().desc(),
                    ExecucaoSdfModel.id.desc(),
                ),
            )
            .label("posicao")
        )
        condicoes = [
            CasoTesteModel.unidade_id == unidade_id,
            CasoTesteModel.ativo.is_(True),
            CasoTesteModel.status.not_in(
                (StatusCasoTeste.DONE.value, StatusCasoTeste.CANCELLED.value)
            ),
            ProjetoModel.ativo.is_(True),
            ProjetoModel.status.not_in(
                (StatusProjeto.COMPLETED.value, StatusProjeto.CANCELED.value)
            ),
        ]
        if escopo.time_ids is not None:
            condicoes.append(ProjetoModel.time_id.in_(escopo.time_ids))
        if escopo.pessoa_id is not None:
            condicoes.append(
                or_(
                    CasoTesteModel.responsavel_id == escopo.pessoa_id,
                    CasoTesteModel.backup_id == escopo.pessoa_id,
                )
            )
        if filtros.projeto_id is not None:
            condicoes.append(CasoTesteModel.projeto_id == filtros.projeto_id)
        if filtros.modelo_dispositivo_id is not None:
            condicoes.append(
                ResultadoFormFactorModel.modelo_dispositivo_id == filtros.modelo_dispositivo_id
            )
        if filtros.responsavel and filtros.responsavel.strip():
            condicoes.append(UsuarioModel.user_id.ilike(f"%{filtros.responsavel.strip()}%"))
        return (
            _resultados_validos(
                unidade_id,
                projeto_do_caso,
                CasoTesteModel.id.label("caso_teste_id"),
                CasoTesteModel.tc_id,
                CasoTesteModel.title.label("titulo"),
                CasoTesteModel.status,
                ProjetoModel.id.label("projeto_id"),
                ProjetoModel.nome.label("projeto_nome"),
                ProjetoModel.time_id,
                ModeloDispositivoModel.id.label("modelo_dispositivo_id"),
                ModeloDispositivoModel.nome.label("modelo_nome"),
                ExecucaoSdfModel.sdf_id,
                ResultadoFormFactorModel.descricao.label("motivo"),
                ResultadoFormFactorModel.resultado,
                ExecucaoSdfModel.data_reportada.label("data_execucao"),
                CasoTesteModel.responsavel_id,
                UsuarioModel.user_id.label("responsavel_identificador"),
                CasoTesteModel.backup_id,
                posicao,
            )
            .join(CasoTesteModel, CasoTesteModel.id == ExecucaoSdfModel.caso_teste_id)
            .join(ProjetoModel, ProjetoModel.id == CasoTesteModel.projeto_id)
            .join(
                ModeloDispositivoModel,
                ModeloDispositivoModel.id == ResultadoFormFactorModel.modelo_dispositivo_id,
            )
            .outerjoin(UsuarioModel, UsuarioModel.id == CasoTesteModel.responsavel_id)
            .where(*condicoes)
            .subquery()
        )
