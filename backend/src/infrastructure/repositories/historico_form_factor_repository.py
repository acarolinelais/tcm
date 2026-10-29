from collections.abc import Sequence
from datetime import date, datetime
from uuid import UUID

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.queries.historico_form_factor import CasoHistorico, LinhaHistoricoExecucao
from src.infrastructure.data.models.caso_teste_model import CasoTesteModel
from src.infrastructure.data.models.execucao_sdf_model import ExecucaoSdfModel
from src.infrastructure.data.models.importacao_sdf_model import ImportacaoSdfModel
from src.infrastructure.data.models.modelo_dispositivo_model import ModeloDispositivoModel
from src.infrastructure.data.models.projeto_modelo_model import ProjetoModeloModel
from src.infrastructure.data.models.resultado_form_factor_model import ResultadoFormFactorModel
from src.infrastructure.data.models.usuario_model import UsuarioModel


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


class HistoricoFormFactorRepositoryImpl:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def listar_casos(
        self,
        unidade_id: UUID,
        projeto_id: UUID,
        busca: str | None = None,
        tc_id: str | None = None,
        modelo_dispositivo_id: UUID | None = None,
        inicio: datetime | None = None,
        fim: datetime | None = None,
    ) -> tuple[CasoHistorico, ...]:
        periodo = _periodo(inicio, fim)

        def existe(*condicoes):
            # O período vale em cada condição: a mesma execução casa com o filtro e o período.
            return (
                _resultados_validos(unidade_id, projeto_id, ResultadoFormFactorModel.id)
                .where(ExecucaoSdfModel.caso_teste_id == CasoTesteModel.id, *periodo, *condicoes)
                .exists()
            )

        filtros = [
            CasoTesteModel.unidade_id == unidade_id,
            CasoTesteModel.projeto_id == projeto_id,
            CasoTesteModel.ativo.is_(True),
        ]
        if tc_id and tc_id.strip():
            filtros.append(CasoTesteModel.tc_id.ilike(f"%{tc_id.strip()}%"))
        if busca and busca.strip():
            termo = f"%{busca.strip()}%"
            filtros.append(
                or_(
                    UsuarioModel.user_id.ilike(termo),
                    existe(ExecucaoSdfModel.sdf_id.ilike(termo)),
                    existe(
                        ModeloDispositivoModel.id == ResultadoFormFactorModel.modelo_dispositivo_id,
                        ModeloDispositivoModel.nome.ilike(termo),
                    ),
                )
            )
        if modelo_dispositivo_id is not None:
            filtros.append(
                existe(ResultadoFormFactorModel.modelo_dispositivo_id == modelo_dispositivo_id)
            )
        if periodo:
            filtros.append(existe())

        linhas = await self.session.execute(
            self._consulta_casos().where(*filtros).order_by(CasoTesteModel.tc_id, CasoTesteModel.id)
        )
        return tuple(CasoHistorico(*linha) for linha in linhas.all())

    async def obter_caso(self, unidade_id: UUID, caso_teste_id: UUID) -> CasoHistorico | None:
        linha = (
            await self.session.execute(
                self._consulta_casos().where(
                    CasoTesteModel.unidade_id == unidade_id,
                    CasoTesteModel.id == caso_teste_id,
                    CasoTesteModel.ativo.is_(True),
                )
            )
        ).one_or_none()
        return CasoHistorico(*linha) if linha else None

    @staticmethod
    def _consulta_casos():
        return select(
            CasoTesteModel.id,
            CasoTesteModel.projeto_id,
            CasoTesteModel.tc_id,
            CasoTesteModel.responsavel_id,
            UsuarioModel.user_id,
        ).outerjoin(UsuarioModel, UsuarioModel.id == CasoTesteModel.responsavel_id)

    async def listar_datas(
        self,
        unidade_id: UUID,
        projeto_id: UUID,
        caso_ids: Sequence[UUID],
        fuso_horario: str,
        inicio: datetime | None = None,
        fim: datetime | None = None,
        limite: int = 7,
        modelo_dispositivo_id: UUID | None = None,
    ) -> tuple[date, ...]:
        """Com `modelo_dispositivo_id` (filtro de Form Factor), só as datas desse modelo."""
        if not caso_ids:
            return ()
        dia = _dia(fuso_horario).label("dia")
        filtros = [ExecucaoSdfModel.caso_teste_id.in_(caso_ids), *_periodo(inicio, fim)]
        if modelo_dispositivo_id is not None:
            filtros.append(ResultadoFormFactorModel.modelo_dispositivo_id == modelo_dispositivo_id)
        linhas = await self.session.execute(
            _resultados_validos(unidade_id, projeto_id, dia)
            .where(*filtros)
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

    async def listar_modelos_da_ultima_execucao(
        self, unidade_id: UUID, projeto_id: UUID, caso_ids: Sequence[UUID]
    ) -> dict[UUID, tuple[UUID, ...]]:
        """Modelos da execução mais recente de cada caso, em qualquer data (spec 032, RN-04)."""
        if not caso_ids:
            return {}
        posicao = (
            func.dense_rank()
            .over(
                partition_by=ExecucaoSdfModel.caso_teste_id,
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
                posicao,
            )
            .where(ExecucaoSdfModel.caso_teste_id.in_(caso_ids))
            .subquery()
        )
        linhas = await self.session.execute(
            select(ordenadas.c.caso_teste_id, ordenadas.c.modelo_dispositivo_id).where(
                ordenadas.c.posicao == 1
            )
        )
        modelos: dict[UUID, tuple[UUID, ...]] = {}
        for caso_id, modelo_id in linhas.all():
            modelos[caso_id] = (*modelos.get(caso_id, ()), modelo_id)
        return modelos
