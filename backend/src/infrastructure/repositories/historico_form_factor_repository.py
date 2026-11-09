from collections.abc import Sequence
from dataclasses import replace
from datetime import date, datetime
from uuid import UUID

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.common.paged_result import PagedResult
from src.domain.queries.historico_form_factor import (
    CasoHistorico,
    FiltrosCasoHistorico,
    LinhaHistoricoExecucao,
)
from src.infrastructure.data.models.caso_teste_model import CasoTesteModel
from src.infrastructure.data.models.execucao_sdf_model import ExecucaoSdfModel
from src.infrastructure.data.models.importacao_sdf_model import ImportacaoSdfModel
from src.infrastructure.data.models.projeto_modelo_model import ProjetoModeloModel
from src.infrastructure.data.models.resultado_form_factor_model import ResultadoFormFactorModel
from src.infrastructure.data.models.usuario_model import UsuarioModel
from src.infrastructure.repositories.execucao_sdf_repository import rodadas_pendentes


def _dia(fuso_horario: str):
    # `data_reportada` é gravada sem fuso, em UTC: converte para o fuso pedido antes de tirar o dia.
    return func.date(
        func.timezone(fuso_horario, func.timezone("UTC", ExecucaoSdfModel.data_reportada))
    )


def _resultados_validos(unidade_id: UUID, projeto_id: UUID, *colunas):
    """Resultados ativos de execuções válidas do projeto, só dos modelos ativos dele.

    Execução válida: importada por uma importação SDF ativa do projeto, ou manual. É a mesma regra
    das tabelas de Form Factor do projeto (`ResultadoFormFactorRepositoryImpl`). O caso não entra
    aqui: quem chama liga a execução ao caso (junção ou correlação com `CasoTesteModel`).
    """
    return (
        select(*colunas)
        .select_from(ResultadoFormFactorModel)
        .join(ExecucaoSdfModel, ResultadoFormFactorModel.execucao_sdf_id == ExecucaoSdfModel.id)
        .join(
            ProjetoModeloModel,
            and_(
                ProjetoModeloModel.projeto_id == projeto_id,
                ProjetoModeloModel.modelo_dispositivo_id
                == ResultadoFormFactorModel.modelo_dispositivo_id,
                ProjetoModeloModel.unidade_id == unidade_id,
                ProjetoModeloModel.ativo.is_(True),
            ),
        )
        .outerjoin(ImportacaoSdfModel, ExecucaoSdfModel.importacao_sdf_id == ImportacaoSdfModel.id)
        .where(
            ResultadoFormFactorModel.unidade_id == unidade_id,
            ResultadoFormFactorModel.ativo.is_(True),
            ExecucaoSdfModel.unidade_id == unidade_id,
            ExecucaoSdfModel.ativo.is_(True),
            or_(
                and_(
                    ExecucaoSdfModel.origem == "SDF",
                    ImportacaoSdfModel.projeto_id == projeto_id,
                    ImportacaoSdfModel.unidade_id == unidade_id,
                    ImportacaoSdfModel.ativo.is_(True),
                ),
                and_(
                    ExecucaoSdfModel.origem == "MANUAL",
                    ExecucaoSdfModel.importacao_sdf_id.is_(None),
                ),
            ),
        )
    )


def _ordem_de_gravacao():
    # Desempate na mesma data: vence a importação mais recente, como no Form Factor do projeto.
    return func.coalesce(ImportacaoSdfModel.created_at, ExecucaoSdfModel.created_at)


def _periodo(inicio: datetime | None, fim: datetime | None) -> list:
    filtros = []
    if inicio is not None:
        filtros.append(ExecucaoSdfModel.data_reportada >= inicio)
    if fim is not None:
        filtros.append(ExecucaoSdfModel.data_reportada < fim)
    return filtros


def _filtros_casos(unidade_id: UUID, projeto_id: UUID, filtros: FiltrosCasoHistorico) -> list:
    """Condições dos filtros e do período sobre `CasoTesteModel` e o tester (`UsuarioModel`)."""
    periodo = _periodo(filtros.inicio, filtros.fim)

    def existe(*condicoes):
        # O período vale em cada condição: a mesma execução casa com o filtro e o período.
        return (
            _resultados_validos(unidade_id, projeto_id, ResultadoFormFactorModel.id)
            .where(ExecucaoSdfModel.caso_teste_id == CasoTesteModel.id, *periodo, *condicoes)
            .exists()
        )

    condicoes = [
        CasoTesteModel.unidade_id == unidade_id,
        CasoTesteModel.projeto_id == projeto_id,
        CasoTesteModel.ativo.is_(True),
    ]
    if filtros.associado_a is not None:
        condicoes.append(
            or_(
                CasoTesteModel.responsavel_id == filtros.associado_a,
                CasoTesteModel.backup_id == filtros.associado_a,
            )
        )
    if filtros.tc_id and filtros.tc_id.strip():
        condicoes.append(CasoTesteModel.tc_id.ilike(f"%{filtros.tc_id.strip()}%"))
    if filtros.responsavel and filtros.responsavel.strip():
        condicoes.append(UsuarioModel.user_id.ilike(f"%{filtros.responsavel.strip()}%"))
    if filtros.sdf_id and filtros.sdf_id.strip():
        # Qualquer device do caso (spec 059, RN-13), não só o que a linha recolhida mostra.
        condicoes.append(existe(ExecucaoSdfModel.sdf_id.ilike(f"%{filtros.sdf_id.strip()}%")))
    if filtros.modelo_dispositivo_id is not None:
        condicoes.append(
            existe(ResultadoFormFactorModel.modelo_dispositivo_id == filtros.modelo_dispositivo_id)
        )
    if periodo:
        condicoes.append(existe())
    return condicoes


def _consulta_casos(*colunas):
    return select(*colunas).outerjoin(
        UsuarioModel, UsuarioModel.id == CasoTesteModel.responsavel_id
    )


_COLUNAS_CASO = (
    CasoTesteModel.id,
    CasoTesteModel.projeto_id,
    CasoTesteModel.tc_id,
    CasoTesteModel.responsavel_id,
    UsuarioModel.user_id,
    CasoTesteModel.backup_id,
)


class HistoricoFormFactorRepositoryImpl:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def listar_casos(
        self,
        unidade_id: UUID,
        projeto_id: UUID,
        filtros: FiltrosCasoHistorico,
        page: int,
        page_size: int,
    ) -> PagedResult[CasoHistorico]:
        condicoes = _filtros_casos(unidade_id, projeto_id, filtros)
        total = (
            await self.session.execute(
                _consulta_casos(func.count(CasoTesteModel.id)).where(*condicoes)
            )
        ).scalar_one()
        linhas = await self.session.execute(
            _consulta_casos(*_COLUNAS_CASO)
            .where(*condicoes)
            .order_by(CasoTesteModel.tc_id, CasoTesteModel.id)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        casos = [CasoHistorico(*linha) for linha in linhas.all()]
        pendentes = await rodadas_pendentes(
            self.session, unidade_id, [caso.caso_teste_id for caso in casos]
        )
        return PagedResult(
            [
                replace(caso, rodada_pendente_id=pendentes[caso.caso_teste_id][0])
                if caso.caso_teste_id in pendentes
                else caso
                for caso in casos
            ],
            page,
            page_size,
            total,
        )

    async def obter_caso(self, unidade_id: UUID, caso_teste_id: UUID) -> CasoHistorico | None:
        linha = (
            await self.session.execute(
                _consulta_casos(*_COLUNAS_CASO).where(
                    CasoTesteModel.unidade_id == unidade_id,
                    CasoTesteModel.id == caso_teste_id,
                    CasoTesteModel.ativo.is_(True),
                )
            )
        ).one_or_none()
        return CasoHistorico(*linha) if linha else None

    async def listar_datas(
        self,
        unidade_id: UUID,
        projeto_id: UUID,
        filtros: FiltrosCasoHistorico,
        fuso_horario: str,
        *,
        limite: int,
    ) -> tuple[date, ...]:
        """Datas de todos os casos que passam pelos filtros, não só os da página (spec 033, RN-03).

        Com `modelo_dispositivo_id` (filtro de Form Factor), só as datas desse modelo.
        """
        dia = _dia(fuso_horario).label("dia")
        casos = _consulta_casos(CasoTesteModel.id).where(
            *_filtros_casos(unidade_id, projeto_id, filtros)
        )
        condicoes = [
            ExecucaoSdfModel.caso_teste_id.in_(casos),
            *_periodo(filtros.inicio, filtros.fim),
        ]
        if filtros.modelo_dispositivo_id is not None:
            condicoes.append(
                ResultadoFormFactorModel.modelo_dispositivo_id == filtros.modelo_dispositivo_id
            )
        linhas = await self.session.execute(
            _resultados_validos(unidade_id, projeto_id, dia)
            .where(*condicoes)
            .distinct()
            .order_by(dia.desc())
            .limit(limite)
        )
        return tuple(linhas.scalars().all())

    async def listar_resultados(
        self,
        unidade_id: UUID,
        projeto_id: UUID,
        caso_ids: Sequence[UUID],
        fuso_horario: str,
        datas: Sequence[date] | None = None,
    ) -> tuple[LinhaHistoricoExecucao, ...]:
        """Sem `datas`, todas as datas dos casos (resumo de execuções); com elas, só essas."""
        if not caso_ids or (datas is not None and not datas):
            return ()
        dia = _dia(fuso_horario)
        consulta = _resultados_validos(
            unidade_id,
            projeto_id,
            ExecucaoSdfModel.caso_teste_id,
            dia,
            ResultadoFormFactorModel.modelo_dispositivo_id,
            ResultadoFormFactorModel.resultado,
            ExecucaoSdfModel.id,
            ExecucaoSdfModel.sdf_id,
            ExecucaoSdfModel.origem,
            ExecucaoSdfModel.data_reportada,
            ResultadoFormFactorModel.descricao,
        ).where(ExecucaoSdfModel.caso_teste_id.in_(caso_ids))
        if datas is not None:
            consulta = consulta.where(dia.in_(datas))
        linhas = await self.session.execute(
            consulta.order_by(
                ExecucaoSdfModel.caso_teste_id,
                ExecucaoSdfModel.data_reportada,
                _ordem_de_gravacao(),
                ExecucaoSdfModel.id,
            )
        )
        return tuple(LinhaHistoricoExecucao(*linha) for linha in linhas.all())

    async def listar_ultimo_sdf_por_modelo(
        self, unidade_id: UUID, projeto_id: UUID, caso_ids: Sequence[UUID]
    ) -> dict[UUID, dict[UUID, str | None]]:
        """SDF ID da execução mais recente de cada caso em cada modelo, em qualquer data (059)."""
        if not caso_ids:
            return {}
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
        ordenadas = (
            _resultados_validos(
                unidade_id,
                projeto_id,
                ExecucaoSdfModel.caso_teste_id.label("caso_teste_id"),
                ResultadoFormFactorModel.modelo_dispositivo_id.label("modelo_dispositivo_id"),
                ExecucaoSdfModel.sdf_id.label("sdf_id"),
                posicao,
            )
            .where(ExecucaoSdfModel.caso_teste_id.in_(caso_ids))
            .subquery()
        )
        linhas = await self.session.execute(
            select(
                ordenadas.c.caso_teste_id, ordenadas.c.modelo_dispositivo_id, ordenadas.c.sdf_id
            ).where(ordenadas.c.posicao == 1)
        )
        ultimos: dict[UUID, dict[UUID, str | None]] = {}
        for caso_id, modelo_id, sdf_id in linhas.all():
            ultimos.setdefault(caso_id, {})[modelo_id] = sdf_id
        return ultimos
