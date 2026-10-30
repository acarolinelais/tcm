from collections.abc import Callable
from datetime import UTC, datetime

from src.application.schemas.overview import OverviewResponse, PontoDesempenhoResponse
from src.application.validators.semana import fuso_horario_valido
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.interfaces.overview_repository import OverviewRepository
from src.domain.queries.resumo_overview import EscopoOverview, ResumoOverview

MESES_DE_DESEMPENHO = 6


class OverviewServiceImpl:
    def __init__(
        self,
        overview_repo: OverviewRepository,
        agora: Callable[[], datetime] = lambda: datetime.now(UTC),
    ) -> None:
        self._overview_repo = overview_repo
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

    @staticmethod
    def _escopo(usuario_atual: UsuarioAutenticado) -> EscopoOverview:
        # RN-01: o admin vê a unidade; gerente e KP, os times do escopo (ADR 0036); os demais, os
        # casos em que são principal ou Backup.
        if usuario_atual.eh_administrador:
            return EscopoOverview()
        if usuario_atual.perfil_codigo in ("GERENTE", "KP"):
            return EscopoOverview(time_ids=usuario_atual.times_no_escopo)
        return EscopoOverview(pessoa_id=usuario_atual.id)
