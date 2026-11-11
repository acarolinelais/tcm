from uuid import UUID

from sqlalchemy import func, not_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from src.domain.common.paged_result import PagedResult
from src.domain.entities.caso_teste import StatusCasoTeste
from src.domain.entities.projeto import StatusProjeto
from src.domain.entities.resultado_form_factor import ResultadoFormFactor
from src.domain.queries.bug_report import CasoComFalhas, FalhaSdf, FiltrosBugReport
from src.domain.queries.resumo_overview import EscopoOverview
from src.infrastructure.data.models.caso_teste_model import CasoTesteModel
from src.infrastructure.data.models.execucao_sdf_model import ExecucaoSdfModel
from src.infrastructure.data.models.importacao_sdf_model import ImportacaoSdfModel
from src.infrastructure.data.models.importacao_sdf_status_model import ImportacaoSdfStatusModel
from src.infrastructure.data.models.modelo_dispositivo_model import ModeloDispositivoModel
from src.infrastructure.data.models.projeto_model import ProjetoModel
from src.infrastructure.data.models.resultado_form_factor_model import ResultadoFormFactorModel
from src.infrastructure.data.models.usuario_model import UsuarioModel
from src.infrastructure.repositories.historico_form_factor_repository import (
    _ordem_de_gravacao,
    _periodo,
    _resultados_validos,
)

_DEV_FIX = aliased(UsuarioModel)
_CAMPOS_FALHA = tuple(FalhaSdf.__dataclass_fields__)


class BugReportRepositoryImpl:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def listar_casos_com_falhas(
        self,
        unidade_id: UUID,
        escopo: EscopoOverview,
        filtros: FiltrosBugReport,
        page: int,
        page_size: int,
    ) -> PagedResult[CasoComFalhas]:
        falhas = self._falhas_visiveis(unidade_id, escopo, filtros)
        casos = select(falhas.c.caso_teste_id).group_by(falhas.c.caso_teste_id, falhas.c.tc_id)
        total = (
            await self.session.execute(select(func.count()).select_from(casos.subquery()))
        ).scalar_one()
        # RN-14: a linha mais nova é a do caso com a falha mais recente.
        ids = (
            (
                await self.session.execute(
                    casos.order_by(
                        func.max(falhas.c.data_execucao).desc(),
                        falhas.c.tc_id,
                        falhas.c.caso_teste_id,
                    )
                    .offset((page - 1) * page_size)
                    .limit(page_size)
                )
            )
            .scalars()
            .all()
        )
        if not ids:
            return PagedResult([], page, page_size, total)
        linhas = await self.session.execute(
            select(falhas)
            .where(falhas.c.caso_teste_id.in_(ids))
            .order_by(falhas.c.data_execucao.desc(), falhas.c.gravacao.desc(), falhas.c.modelo_nome)
        )
        por_caso: dict[UUID, list] = {id_: [] for id_ in ids}
        for linha in linhas:
            por_caso[linha.caso_teste_id].append(linha)
        return PagedResult([_caso(itens) for itens in por_caso.values()], page, page_size, total)

    @staticmethod
    def _falhas_visiveis(unidade_id: UUID, escopo: EscopoOverview, filtros: FiltrosBugReport):
        """Falhas do projeto que ainda estão na página (RN-06 a RN-08), com o caso de cada uma."""
        importacao = aliased(ImportacaoSdfModel)
        # RN-08: por caso, a importação ativa mais recente que encerrou uma correção. As falhas
        # gravadas até ela saem; desfazer a importação as traz de volta.
        corte = (
            select(
                ImportacaoSdfStatusModel.caso_teste_id,
                func.max(importacao.created_at).label("ate"),
            )
            .join(importacao, importacao.id == ImportacaoSdfStatusModel.importacao_sdf_id)
            .where(
                ImportacaoSdfStatusModel.unidade_id == unidade_id,
                ImportacaoSdfStatusModel.concluiu_correcao.is_(True),
                importacao.projeto_id == filtros.projeto_id,
                importacao.ativo.is_(True),
            )
            .group_by(ImportacaoSdfStatusModel.caso_teste_id)
            .subquery()
        )
        condicoes = [
            CasoTesteModel.unidade_id == unidade_id,
            CasoTesteModel.projeto_id == filtros.projeto_id,
            CasoTesteModel.ativo.is_(True),
            CasoTesteModel.status != StatusCasoTeste.CANCELLED.value,
            ProjetoModel.ativo.is_(True),
            ProjetoModel.status.not_in(
                (StatusProjeto.COMPLETED.value, StatusProjeto.CANCELED.value)
            ),
            not_(
                func.upper(func.trim(ResultadoFormFactorModel.resultado)).in_(
                    ResultadoFormFactor.NAO_FALHA
                )
            ),
            # As execuções da importação que fechou o caso têm o mesmo now() dela, então ficam de
            # fora pelo `>`.
            or_(corte.c.ate.is_(None), ExecucaoSdfModel.created_at > corte.c.ate),
        ]
        if escopo.time_ids is not None:
            condicoes.append(ProjetoModel.time_id.in_(escopo.time_ids))
        if escopo.pessoa_id is not None:
            condicoes.append(
                or_(
                    CasoTesteModel.responsavel_id == escopo.pessoa_id,
                    CasoTesteModel.backup_id == escopo.pessoa_id,
                    CasoTesteModel.dev_fix_id == escopo.pessoa_id,
                )
            )
        if filtros.modelo_dispositivo_id is not None:
            condicoes.append(
                ResultadoFormFactorModel.modelo_dispositivo_id == filtros.modelo_dispositivo_id
            )
        if filtros.responsavel and filtros.responsavel.strip():
            condicoes.append(
                UsuarioModel.user_id.icontains(filtros.responsavel.strip(), autoescape=True)
            )
        if filtros.dev_fix and filtros.dev_fix.strip():
            condicoes.append(_DEV_FIX.user_id.icontains(filtros.dev_fix.strip(), autoescape=True))
        condicoes.extend(_periodo(filtros.inicio, filtros.fim))
        return (
            _resultados_validos(
                unidade_id,
                filtros.projeto_id,
                CasoTesteModel.id.label("caso_teste_id"),
                CasoTesteModel.tc_id,
                CasoTesteModel.status,
                ProjetoModel.time_id,
                CasoTesteModel.responsavel_id,
                UsuarioModel.user_id.label("responsavel_identificador"),
                CasoTesteModel.backup_id,
                CasoTesteModel.dev_fix_id,
                _DEV_FIX.user_id.label("dev_fix_identificador"),
                ModeloDispositivoModel.id.label("modelo_dispositivo_id"),
                ModeloDispositivoModel.nome.label("modelo_nome"),
                ExecucaoSdfModel.sdf_id,
                ResultadoFormFactorModel.resultado,
                ResultadoFormFactorModel.descricao,
                ExecucaoSdfModel.data_reportada.label("data_execucao"),
                _ordem_de_gravacao().label("gravacao"),
            )
            .join(CasoTesteModel, CasoTesteModel.id == ExecucaoSdfModel.caso_teste_id)
            .join(ProjetoModel, ProjetoModel.id == CasoTesteModel.projeto_id)
            .join(
                ModeloDispositivoModel,
                ModeloDispositivoModel.id == ResultadoFormFactorModel.modelo_dispositivo_id,
            )
            .outerjoin(UsuarioModel, UsuarioModel.id == CasoTesteModel.responsavel_id)
            .outerjoin(_DEV_FIX, _DEV_FIX.id == CasoTesteModel.dev_fix_id)
            .outerjoin(corte, corte.c.caso_teste_id == CasoTesteModel.id)
            .where(*condicoes)
            .subquery()
        )


def _caso(linhas: list) -> CasoComFalhas:
    primeira = linhas[0]
    return CasoComFalhas(
        caso_teste_id=primeira.caso_teste_id,
        tc_id=primeira.tc_id,
        status=primeira.status,
        time_id=primeira.time_id,
        responsavel_id=primeira.responsavel_id,
        responsavel_identificador=primeira.responsavel_identificador,
        backup_id=primeira.backup_id,
        dev_fix_id=primeira.dev_fix_id,
        dev_fix_identificador=primeira.dev_fix_identificador,
        falhas=tuple(FalhaSdf(*(linha._mapping[c] for c in _CAMPOS_FALHA)) for linha in linhas),
    )
