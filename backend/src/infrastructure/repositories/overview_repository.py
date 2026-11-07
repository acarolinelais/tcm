from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, Text, and_, column, distinct, func, or_, select, table, values
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.entities.caso_teste import StatusCasoTeste
from src.domain.queries.resumo_overview import (
    Andamento,
    ConcluidosDev,
    EscopoOverview,
    PassRate,
    PassRateModelo,
    ProjetoOverview,
    ProjetoPessoal,
    ResumoOverview,
    ResumoPessoal,
    ResumoTime,
)
from src.infrastructure.data.models.caso_teste_model import CasoTesteModel
from src.infrastructure.data.models.execucao_sdf_model import ExecucaoSdfModel
from src.infrastructure.data.models.modelo_dispositivo_model import ModeloDispositivoModel
from src.infrastructure.data.models.perfil_model import PerfilModel
from src.infrastructure.data.models.projeto_model import ProjetoModel
from src.infrastructure.data.models.resultado_form_factor_model import ResultadoFormFactorModel
from src.infrastructure.data.models.rodada_form_factor_model import RodadaFormFactorModel
from src.infrastructure.data.models.setor_model import SetorModel
from src.infrastructure.data.models.time_membro_model import TimeMembroModel
from src.infrastructure.data.models.time_model import TimeModel
from src.infrastructure.data.models.usuario_model import UsuarioModel

# Escrita só pelos triggers (ADR 0044): aqui basta a forma da tabela para a leitura.
_auditoria = table(
    "auditoria_alteracoes",
    column("unidade_id"),
    column("table_name"),
    column("operation"),
    column("row_id"),
    column("old_values", JSONB),
    column("new_values", JSONB),
    column("changed_fields", ARRAY(Text)),
    column("created_at"),
)


_status_novo = _auditoria.c.new_values["status"].astext


def _mudou_status(unidade_id: UUID):
    """Auditoria em que um caso ganhou um Status: na criação ou numa mudança de Status."""
    return (
        _auditoria.c.unidade_id == unidade_id,
        _auditoria.c.table_name == CasoTesteModel.__tablename__,
        or_(
            _auditoria.c.operation == "INSERT",
            _auditoria.c.changed_fields.contains(["status"]),
        ),
    )


def _entrou_em_done(unidade_id: UUID):
    """Auditoria de um caso que entrou em Done: criado já em Done ou com o Status mudado."""
    return (*_mudou_status(unidade_id), _status_novo == StatusCasoTeste.DONE.value)


def _ultimas_entradas_em_done(unidade_id: UUID, casos, desde: datetime):
    """A última entrada em Done de cada caso de `casos` (spec 063, RN-02), se for desde `desde`.

    Filtrar antes do max dá o mesmo resultado e só lê a auditoria do período.
    """
    return (
        select(func.max(_auditoria.c.created_at).label("quando"))
        .where(
            *_entrou_em_done(unidade_id),
            _auditoria.c.created_at >= desde,
            _auditoria.c.row_id.in_(casos),
        )
        .group_by(_auditoria.c.row_id)
        .subquery()
    )


_EM_ANDAMENTO = (
    StatusCasoTeste.IN_PROGRESS.value,
    StatusCasoTeste.IN_REVIEW.value,
    StatusCasoTeste.IN_VALIDATION.value,
    StatusCasoTeste.IN_FIXES.value,
)


class OverviewRepositoryImpl:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def resumir(
        self,
        unidade_id: UUID,
        escopo: EscopoOverview,
        usuario_id: UUID,
        desde: datetime,
        fuso_horario: str,
    ) -> ResumoOverview:
        filtros = [
            CasoTesteModel.unidade_id == unidade_id,
            CasoTesteModel.ativo.is_(True),
            ProjetoModel.ativo.is_(True),
            CasoTesteModel.status != StatusCasoTeste.CANCELLED.value,
        ]
        if escopo.time_ids is not None:
            filtros.append(ProjetoModel.time_id.in_(escopo.time_ids))
        if escopo.pessoa_id is not None:
            filtros.append(
                or_(
                    CasoTesteModel.responsavel_id == escopo.pessoa_id,
                    CasoTesteModel.backup_id == escopo.pessoa_id,
                )
            )
        casos = (
            select(CasoTesteModel.id)
            .join(ProjetoModel, ProjetoModel.id == CasoTesteModel.projeto_id)
            .where(*filtros)
        )

        status = CasoTesteModel.status
        contagens = (
            await self._session.execute(
                # Mesmo FROM e filtros dos `casos`: cards e desempenho contam os mesmos casos.
                casos.with_only_columns(
                    func.count(),
                    func.count().filter(status == StatusCasoTeste.DONE.value),
                    func.count().filter(status.in_(_EM_ANDAMENTO)),
                    func.count().filter(status == StatusCasoTeste.TO_DO.value),
                    func.count().filter(CasoTesteModel.responsavel_id == usuario_id),
                )
            )
        ).one()

        # Spec 039, RN-04.
        mes = func.to_char(func.timezone(fuso_horario, _auditoria.c.created_at), "YYYY-MM")
        por_mes = await self._session.execute(
            select(mes.label("mes"), func.count(distinct(_auditoria.c.row_id)))
            .where(
                *_entrou_em_done(unidade_id),
                _auditoria.c.created_at >= desde,
                _auditoria.c.row_id.in_(casos),
            )
            # Pelo rótulo: repetir a expressão geraria outro parâmetro para o fuso.
            .group_by("mes")
        )
        return ResumoOverview(*contagens, concluidos_por_mes=dict(por_mes.all()))

    async def resumir_time(
        self,
        unidade_id: UUID,
        escopo: EscopoOverview,
        desde_dia: datetime,
        desde_semana: datetime,
        fuso_horario: str,
    ) -> ResumoTime:
        projetos_filtros = [ProjetoModel.unidade_id == unidade_id, ProjetoModel.ativo.is_(True)]
        if escopo.time_ids is not None:
            projetos_filtros.append(ProjetoModel.time_id.in_(escopo.time_ids))
        projetos = (
            await self._session.execute(
                select(ProjetoModel.id, ProjetoModel.nome, ProjetoModel.app)
                .where(*projetos_filtros)
                .order_by(ProjetoModel.nome)
            )
        ).all()

        casos = (
            select(CasoTesteModel.id)
            .join(ProjetoModel, ProjetoModel.id == CasoTesteModel.projeto_id)
            .where(
                *projetos_filtros,
                CasoTesteModel.unidade_id == unidade_id,
                CasoTesteModel.ativo.is_(True),
                CasoTesteModel.status != StatusCasoTeste.CANCELLED.value,
            )
        )
        status = CasoTesteModel.status
        done = status == StatusCasoTeste.DONE.value
        por_projeto = (
            await self._session.execute(
                casos.with_only_columns(
                    CasoTesteModel.projeto_id,
                    func.count().filter(CasoTesteModel.created_at >= desde_dia).label("criados"),
                    func.count().filter(done).label("feitos"),
                    func.count().label("total"),
                    func.count()
                    .filter(status == StatusCasoTeste.IN_FIXES.value)
                    .label("em_correcao"),
                    func.count().filter(status.in_(_EM_ANDAMENTO)).label("em_andamento"),
                ).group_by(CasoTesteModel.projeto_id)
            )
        ).all()

        # Spec 064, RN-02 e RN-08: as mesmas etapas dos cards da spec 039.
        etapas = (
            func.count().filter(status == StatusCasoTeste.TO_DO.value),
            func.count().filter(status.in_(_EM_ANDAMENTO)),
            func.count().filter(done),
        )
        com_time = casos.join(TimeModel, TimeModel.id == ProjetoModel.time_id).where(
            TimeModel.ativo.is_(True)
        )
        por_time = (
            await self._session.execute(
                com_time.with_only_columns(TimeModel.id, TimeModel.nome, *etapas)
                .group_by(TimeModel.id, TimeModel.nome)
                .order_by(TimeModel.nome)
            )
        ).all()
        por_setor = (
            await self._session.execute(
                com_time.join(SetorModel, SetorModel.id == TimeModel.setor_id)
                .where(SetorModel.ativo.is_(True))
                .with_only_columns(SetorModel.id, SetorModel.nome, *etapas)
                .group_by(SetorModel.id, SetorModel.nome)
                .order_by(SetorModel.nome)
            )
        ).all()

        # Spec 064, RN-06: a rodada ativa mais recente de cada projeto do escopo.
        ultima_rodada = (
            select(RodadaFormFactorModel.id, RodadaFormFactorModel.projeto_id)
            .where(
                RodadaFormFactorModel.unidade_id == unidade_id,
                RodadaFormFactorModel.ativo.is_(True),
                RodadaFormFactorModel.projeto_id.in_(
                    select(ProjetoModel.id).where(*projetos_filtros)
                ),
            )
            .distinct(RodadaFormFactorModel.projeto_id)
            .order_by(
                RodadaFormFactorModel.projeto_id,
                RodadaFormFactorModel.created_at.desc(),
                # Desempate igual ao do pass_rate_ultima_rodada: as duas escolhem a mesma rodada.
                RodadaFormFactorModel.id.desc(),
            )
            .subquery()
        )
        pass_rate = (
            await self._session.execute(
                select(
                    ultima_rodada.c.projeto_id,
                    func.count().filter(ResultadoFormFactorModel.resultado == "PASS"),
                    func.count(),
                )
                .select_from(ResultadoFormFactorModel)
                .join(
                    ExecucaoSdfModel,
                    ExecucaoSdfModel.id == ResultadoFormFactorModel.execucao_sdf_id,
                )
                .join(ultima_rodada, ultima_rodada.c.id == ExecucaoSdfModel.rodada_id)
                .where(
                    ResultadoFormFactorModel.unidade_id == unidade_id,
                    ResultadoFormFactorModel.ativo.is_(True),
                    ExecucaoSdfModel.ativo.is_(True),
                )
                .group_by(ultima_rodada.c.projeto_id)
            )
        ).all()

        # RN-10: só os devs do time; quem tem 0 Done aparece com 0, e ser Backup não conta.
        membros_filtros = [
            TimeMembroModel.unidade_id == unidade_id,
            TimeMembroModel.ativo.is_(True),
        ]
        if escopo.time_ids is not None:
            membros_filtros.append(TimeMembroModel.time_id.in_(escopo.time_ids))
        concluidos = (
            casos.with_only_columns(
                CasoTesteModel.responsavel_id.label("usuario_id"), func.count().label("total")
            )
            .where(done)
            .group_by(CasoTesteModel.responsavel_id)
            .subquery()
        )
        por_dev = (
            await self._session.execute(
                select(UsuarioModel.id, UsuarioModel.nome, func.coalesce(concluidos.c.total, 0))
                .outerjoin(concluidos, concluidos.c.usuario_id == UsuarioModel.id)
                .join(PerfilModel, PerfilModel.id == UsuarioModel.perfil_id)
                .where(
                    UsuarioModel.ativo.is_(True),
                    PerfilModel.codigo == "USUARIO_PADRAO",
                    UsuarioModel.id.in_(select(TimeMembroModel.usuario_id).where(*membros_filtros)),
                )
                .order_by(UsuarioModel.nome)
            )
        ).all()

        ultima = _ultimas_entradas_em_done(unidade_id, casos, desde_semana)
        semana = func.to_char(
            func.date_trunc("week", func.timezone(fuso_horario, ultima.c.quando)), "YYYY-MM-DD"
        )
        por_semana = await self._session.execute(
            select(semana.label("semana"), func.count()).group_by("semana")
        )

        return ResumoTime(
            projetos=[ProjetoOverview(*linha) for linha in projetos],
            criados_por_projeto={linha.projeto_id: linha.criados for linha in por_projeto},
            concluidos_por_dev=[ConcluidosDev(*linha) for linha in por_dev],
            concluidos_por_semana=dict(por_semana.all()),
            done_por_projeto={p.projeto_id: (p.feitos, p.total) for p in por_projeto},
            em_andamento_por_projeto={p.projeto_id: p.em_andamento for p in por_projeto},
            andamento_por_time=[Andamento(*linha) for linha in por_time],
            andamento_por_setor=[Andamento(*linha) for linha in por_setor],
            em_correcao_por_projeto={
                p.projeto_id: p.em_correcao for p in por_projeto if p.em_correcao
            },
            pass_rate_por_projeto={
                projeto_id: (aprovados, total) for projeto_id, aprovados, total in pass_rate
            },
        )

    async def burndown_executado(
        self, unidade_id: UUID, projeto_id: UUID, fins: list[datetime]
    ) -> list[int]:
        dias = values(column("fim", DateTime(timezone=True)), name="dias").data(
            [(fim,) for fim in fins]
        )

        def status_na_mudanca(status, antes: bool):
            do_caso = (*_mudou_status(unidade_id), _auditoria.c.row_id == CasoTesteModel.id)
            quando = _auditoria.c.created_at
            return (
                select(status)
                .where(*do_caso, quando < dias.c.fim if antes else quando >= dias.c.fim)
                .order_by(quando.desc() if antes else quando)
                .limit(1)
                .scalar_subquery()
            )

        # Status no fim do dia: o da última mudança antes dele; sem nenhuma (caso anterior à
        # auditoria, ADR 0044), o que a primeira mudança depois dele substituiu; sem mudança
        # nenhuma, o Status atual.
        status_no_dia = func.coalesce(
            status_na_mudanca(_status_novo, antes=True),
            status_na_mudanca(_auditoria.c.old_values["status"].astext, antes=False),
            CasoTesteModel.status,
        )
        linhas = await self._session.execute(
            select(dias.c.fim, func.count())
            .select_from(dias)
            .join(
                CasoTesteModel,
                and_(
                    CasoTesteModel.unidade_id == unidade_id,
                    CasoTesteModel.projeto_id == projeto_id,
                    CasoTesteModel.ativo.is_(True),
                    CasoTesteModel.status != StatusCasoTeste.CANCELLED.value,
                    # `created_at` guarda UTC sem fuso.
                    CasoTesteModel.created_at < func.timezone("UTC", dias.c.fim),
                ),
            )
            .where(status_no_dia != StatusCasoTeste.DONE.value)
            .group_by(dias.c.fim)
        )
        por_fim = dict(linhas.all())
        return [por_fim.get(fim, 0) for fim in fins]

    async def pass_rate_ultima_rodada(self, unidade_id: UUID, projeto_id: UUID) -> PassRate | None:
        rodada = (
            await self._session.execute(
                select(RodadaFormFactorModel.id, RodadaFormFactorModel.created_at)
                .where(
                    RodadaFormFactorModel.unidade_id == unidade_id,
                    RodadaFormFactorModel.projeto_id == projeto_id,
                    RodadaFormFactorModel.ativo.is_(True),
                )
                .order_by(RodadaFormFactorModel.created_at.desc(), RodadaFormFactorModel.id.desc())
                .limit(1)
            )
        ).first()
        if rodada is None:
            return None
        resultado = ResultadoFormFactorModel.resultado
        linhas = await self._session.execute(
            select(
                ModeloDispositivoModel.id,
                ModeloDispositivoModel.nome,
                func.count().filter(resultado == "PASS"),
                func.count(),
            )
            .select_from(ResultadoFormFactorModel)
            .join(ExecucaoSdfModel, ExecucaoSdfModel.id == ResultadoFormFactorModel.execucao_sdf_id)
            .join(
                ModeloDispositivoModel,
                ModeloDispositivoModel.id == ResultadoFormFactorModel.modelo_dispositivo_id,
            )
            .where(
                ResultadoFormFactorModel.unidade_id == unidade_id,
                ResultadoFormFactorModel.ativo.is_(True),
                ExecucaoSdfModel.rodada_id == rodada.id,
                ExecucaoSdfModel.ativo.is_(True),
            )
            .group_by(ModeloDispositivoModel.id, ModeloDispositivoModel.nome)
            .order_by(ModeloDispositivoModel.nome)
        )
        return PassRate(rodada.created_at, [PassRateModelo(*linha) for linha in linhas])

    async def resumir_pessoal(
        self, unidade_id: UUID, pessoa_id: UUID, desde: datetime, fuso_horario: str
    ) -> ResumoPessoal:
        casos = (
            select(CasoTesteModel.id)
            .join(ProjetoModel, ProjetoModel.id == CasoTesteModel.projeto_id)
            .where(
                CasoTesteModel.unidade_id == unidade_id,
                CasoTesteModel.ativo.is_(True),
                ProjetoModel.ativo.is_(True),
                CasoTesteModel.status != StatusCasoTeste.CANCELLED.value,
                CasoTesteModel.responsavel_id == pessoa_id,
            )
        )
        por_dificuldade = (
            await self._session.execute(
                casos.with_only_columns(
                    CasoTesteModel.difficulty,
                    func.count(),
                    func.count().filter(CasoTesteModel.status == StatusCasoTeste.DONE.value),
                ).group_by(CasoTesteModel.difficulty)
            )
        ).all()

        status = CasoTesteModel.status
        por_projeto = (
            await self._session.execute(
                casos.with_only_columns(
                    ProjetoModel.id,
                    ProjetoModel.nome,
                    ProjetoModel.app,
                    func.count().filter(status == StatusCasoTeste.DONE.value),
                    func.count().filter(status.in_(_EM_ANDAMENTO)),
                    func.count(),
                )
                .group_by(ProjetoModel.id, ProjetoModel.nome, ProjetoModel.app)
                .order_by(ProjetoModel.nome)
            )
        ).all()

        ultima = _ultimas_entradas_em_done(unidade_id, casos, desde)
        dia = func.to_char(func.timezone(fuso_horario, ultima.c.quando), "YYYY-MM-DD")
        por_dia = await self._session.execute(
            select(dia.label("dia"), func.count()).group_by("dia")
        )
        return ResumoPessoal(
            concluidos=sum(feitos for _, _, feitos in por_dificuldade),
            atribuidos=sum(total for _, total, _ in por_dificuldade),
            por_dificuldade={dificuldade: total for dificuldade, total, _ in por_dificuldade},
            concluidos_por_dia=dict(por_dia.all()),
            por_projeto=[ProjetoPessoal(*linha) for linha in por_projeto],
        )
