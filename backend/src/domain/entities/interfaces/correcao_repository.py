from typing import Protocol
from uuid import UUID

from src.domain.common.paged_result import PagedResult
from src.domain.entities.correcao import Correcao
from src.domain.queries.correcao_concluida import CorrecaoConcluida, FiltrosCorrecoesConcluidas
from src.domain.queries.resumo_overview import EscopoOverview


class CorrecaoRepository(Protocol):
    async def adicionar(self, entity: Correcao) -> None: ...

    async def atualizar(self, entity: Correcao) -> None: ...

    async def obter_aberta(self, unidade_id: UUID, caso_teste_id: UUID) -> Correcao | None: ...

    async def obter_por_tentativa(
        self, unidade_id: UUID, caso_teste_id: UUID, tentativa: int
    ) -> Correcao | None: ...

    async def listar_por_importacao(
        self, unidade_id: UUID, importacao_sdf_id: UUID
    ) -> tuple[Correcao, ...]:
        """Tentativas abertas ou fechadas por esta importação, para o desfazer (RN-06)."""
        ...

    async def listar_concluidas(
        self,
        unidade_id: UUID,
        escopo: EscopoOverview,
        filtros: FiltrosCorrecoesConcluidas,
        page: int,
        page_size: int,
        fuso_horario: str,
    ) -> PagedResult[CorrecaoConcluida]:
        """Tentativas fechadas do projeto no escopo, a mais recente primeiro (RN-13 a RN-15)."""
        ...
