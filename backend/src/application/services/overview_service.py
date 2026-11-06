from collections.abc import Callable
from datetime import UTC, date, datetime, time, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

from src.application.schemas.overview import (
    ConcluidosDevResponse,
    ConcluidosSemanaResponse,
    CriacaoProjetoResponse,
    DoneProjetoResponse,
    EntregasDiaResponse,
    OverviewPessoalResponse,
    OverviewProjetoResponse,
    OverviewResponse,
    OverviewTimeResponse,
    PassRateModeloResponse,
    PassRateResponse,
    PontoBurndownResponse,
    PontoDesempenhoResponse,
    ProjetoOverviewResponse,
)
from src.application.validators.semana import fuso_horario_valido
from src.domain.common.exceptions import NotFoundException
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.caso_teste import DificuldadeCasoTeste
from src.domain.entities.interfaces.overview_repository import OverviewRepository
from src.domain.entities.interfaces.projeto_repository import ProjetoRepository
from src.domain.entities.interfaces.time_repository import TimeRepository
from src.domain.queries.resumo_overview import EscopoOverview, ResumoOverview, ResumoTime

MESES_DE_DESEMPENHO = 6
# Spec 063, RN-03: os gráficos por dia mostram 30 dias, e os por semana, 12 semanas.
DIAS = 30
SEMANAS = 12
# shortcut: a mesma meta para todos os projetos (spec 063, RN-07); trocar pelo planejamento por
# projeto quando a spec dele existir.
META_DIARIA = 2


def _ultimos_dias(hoje: date) -> list[date]:
    """Spec 063, RN-03: os 30 dias até hoje, do mais antigo para o atual."""
    return [hoje - timedelta(days=atras) for atras in range(DIAS - 1, -1, -1)]


def _ultimas_semanas(hoje: date) -> list[date]:
    """Spec 063, RN-03: as segundas das 12 semanas até a de hoje, da mais antiga à atual."""
    segunda = hoje - timedelta(days=hoje.weekday())
    return [segunda - timedelta(weeks=atras) for atras in range(SEMANAS - 1, -1, -1)]


def linha_planejada(dias: list[date], inicio: int) -> list[int]:
    """Planejado do burndown (spec 063, RN-07): começa em `inicio` e cai a META_DIARIA a cada
    dia útil (segunda a sexta) depois do primeiro, até 0."""
    linha, restante = [], inicio
    for indice, dia in enumerate(dias):
        if indice and dia.weekday() < 5:
            restante = max(restante - META_DIARIA, 0)
        linha.append(restante)
    return linha


class OverviewServiceImpl:
    def __init__(
        self,
        overview_repo: OverviewRepository,
        projeto_repo: ProjetoRepository,
        time_repo: TimeRepository,
        agora: Callable[[], datetime] = lambda: datetime.now(UTC),
    ) -> None:
        self._overview_repo = overview_repo
        self._projeto_repo = projeto_repo
        self._time_repo = time_repo
        self._agora = agora

    async def obter(self, usuario_atual: UsuarioAutenticado, fuso_horario: str) -> OverviewResponse:
        fuso = fuso_horario_valido(fuso_horario)
        hoje = self._agora().astimezone(fuso)
        # Do mais antigo para o atual: (ano, mês) dos últimos 6 meses no fuso de quem consulta.
        meses = []
        for atras in range(MESES_DE_DESEMPENHO - 1, -1, -1):
            ano, indice = divmod(hoje.year * 12 + hoje.month - 1 - atras, 12)
            meses.append((ano, indice + 1))
        rotulos = [f"{ano:04}-{mes:02}" for ano, mes in meses]

        escopo = self._escopo(usuario_atual)
        if escopo.time_ids == ():
            # KP ou gerente sem time: nada a contar (CA-05).
            resumo = ResumoOverview()
        else:
            ano, mes = meses[0]
            desde = datetime(ano, mes, 1, tzinfo=fuso)
            resumo = await self._overview_repo.resumir(
                usuario_atual.unidade_id, escopo, usuario_atual.id, desde, fuso.key
            )
        por_mes = resumo.concluidos_por_mes
        return OverviewResponse(
            total=resumo.total,
            concluidos=resumo.concluidos,
            em_andamento=resumo.em_andamento,
            a_fazer=resumo.a_fazer,
            atribuidos=resumo.atribuidos,
            desempenho=[
                PontoDesempenhoResponse(mes=rotulo, concluidos=por_mes.get(rotulo, 0))
                for rotulo in rotulos
            ],
        )

    async def obter_time(
        self, usuario_atual: UsuarioAutenticado, fuso_horario: str
    ) -> OverviewTimeResponse:
        fuso = fuso_horario_valido(fuso_horario)
        hoje = self._hoje(fuso)
        semanas = _ultimas_semanas(hoje)
        rotulos = [dia.isoformat() for dia in semanas]
        # `casos_teste.created_at` guarda UTC sem fuso, como no `intervalo_dia`.
        desde_dia = datetime.combine(_ultimos_dias(hoje)[0], time(), fuso)
        desde_dia = desde_dia.astimezone(UTC).replace(tzinfo=None)

        escopo = self._escopo(usuario_atual)
        if escopo.pessoa_id is not None or escopo.time_ids == ():
            # O dev tem a visão pessoal; KP ou gerente sem time não têm o que mostrar.
            resumo = ResumoTime()
        else:
            resumo = await self._overview_repo.resumir_time(
                usuario_atual.unidade_id,
                escopo,
                desde_dia,
                datetime.combine(semanas[0], time(), fuso),
                fuso.key,
            )
        projetos = resumo.projetos
        return OverviewTimeResponse(
            projetos=[ProjetoOverviewResponse(id=p.id, nome=p.nome, app=p.app) for p in projetos],
            criacao_por_dia=[
                CriacaoProjetoResponse(
                    projeto_id=p.id,
                    projeto=p.nome,
                    media=resumo.criados_por_projeto.get(p.id, 0) / DIAS,
                )
                for p in projetos
            ],
            concluidos_por_dev=[
                ConcluidosDevResponse(
                    usuario_id=dev.usuario_id, nome=dev.nome, concluidos=dev.concluidos
                )
                for dev in resumo.concluidos_por_dev
            ],
            concluidos_por_semana=[
                ConcluidosSemanaResponse(
                    semana=rotulo, concluidos=resumo.concluidos_por_semana.get(rotulo, 0)
                )
                for rotulo in rotulos
            ],
            done_por_projeto=[
                DoneProjetoResponse(
                    projeto_id=p.id, projeto=p.nome, concluidos=concluidos, total=total
                )
                for p in projetos
                for concluidos, total in [resumo.done_por_projeto.get(p.id, (0, 0))]
            ],
        )

    async def obter_projeto(
        self, usuario_atual: UsuarioAutenticado, projeto_id: UUID, fuso_horario: str
    ) -> OverviewProjetoResponse:
        fuso = fuso_horario_valido(fuso_horario)
        unidade_id = usuario_atual.unidade_id
        # Mesmo critério do Form Factor: fora do escopo, inexistente ou inativo é 404 (CA-11).
        projeto = await self._projeto_repo.obter_por_id(unidade_id, projeto_id)
        if projeto is None or not projeto.ativo:
            raise NotFoundException("Projeto não encontrado.")
        time_ = await self._time_repo.obter_por_id(unidade_id, projeto.time_id)
        if time_ is None or not usuario_atual.time_no_escopo(time_.id, time_.setor_id):
            raise NotFoundException("Projeto não encontrado.")

        dias = _ultimos_dias(self._hoje(fuso))
        fins = [datetime.combine(dia + timedelta(days=1), time(), fuso) for dia in dias]
        executado = await self._overview_repo.burndown_executado(unidade_id, projeto.id, fins)
        planejado = linha_planejada(dias, executado[0])
        pass_rate = await self._overview_repo.pass_rate_ultima_rodada(unidade_id, projeto.id)
        return OverviewProjetoResponse(
            burndown=[
                PontoBurndownResponse(dia=dia.isoformat(), planejado=plano, executado=feito)
                for dia, plano, feito in zip(dias, planejado, executado, strict=True)
            ],
            pass_rate=None
            if pass_rate is None
            else PassRateResponse(
                rodada_em=pass_rate.rodada_em,
                modelos=[
                    PassRateModeloResponse(
                        modelo_id=m.modelo_id, modelo=m.modelo, aprovados=m.aprovados, total=m.total
                    )
                    for m in pass_rate.modelos
                ],
            ),
        )

    async def obter_pessoal(
        self, usuario_atual: UsuarioAutenticado, fuso_horario: str
    ) -> OverviewPessoalResponse:
        fuso = fuso_horario_valido(fuso_horario)
        hoje = self._hoje(fuso)
        dias = _ultimos_dias(hoje)
        semanas = _ultimas_semanas(hoje)
        # RN-13 a RN-16: só os casos em que a pessoa é a responsável principal.
        resumo = await self._overview_repo.resumir_pessoal(
            usuario_atual.unidade_id,
            usuario_atual.id,
            datetime.combine(semanas[0], time(), fuso),
            fuso.key,
        )
        por_semana: dict[date, int] = {}
        for rotulo, concluidos in resumo.concluidos_por_dia.items():
            dia = date.fromisoformat(rotulo)
            segunda = dia - timedelta(days=dia.weekday())
            por_semana[segunda] = por_semana.get(segunda, 0) + concluidos
        return OverviewPessoalResponse(
            concluidos=resumo.concluidos,
            atribuidos=resumo.atribuidos,
            por_dificuldade={
                dificuldade.value: resumo.por_dificuldade.get(dificuldade.value, 0)
                for dificuldade in DificuldadeCasoTeste
            },
            entregas_por_dia=[
                EntregasDiaResponse(
                    dia=dia.isoformat(),
                    concluidos=resumo.concluidos_por_dia.get(dia.isoformat(), 0),
                )
                for dia in dias
            ],
            entregas_por_semana=[
                ConcluidosSemanaResponse(
                    semana=segunda.isoformat(), concluidos=por_semana.get(segunda, 0)
                )
                for segunda in semanas
            ],
        )

    def _hoje(self, fuso: ZoneInfo) -> date:
        return self._agora().astimezone(fuso).date()

    @staticmethod
    def _escopo(usuario_atual: UsuarioAutenticado) -> EscopoOverview:
        # RN-01: o admin vê a unidade; gerente e KP, os times do escopo (ADR 0036); os demais, os
        # casos em que são principal ou Backup.
        if usuario_atual.eh_administrador:
            return EscopoOverview()
        if usuario_atual.perfil_codigo in ("GERENTE", "KP"):
            return EscopoOverview(time_ids=usuario_atual.times_no_escopo)
        return EscopoOverview(pessoa_id=usuario_atual.id)
