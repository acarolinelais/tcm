from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass(frozen=True)
class CorrecaoConcluida:
    """Uma tentativa de correção fechada, como a visão Concluídas da My Fixes mostra (spec 076)."""

    id: UUID
    caso_teste_id: UUID
    tc_id: str
    tentativa: int
    origem: str
    corretor_id: UUID | None
    corretor_identificador: str | None
    falha_em: datetime
    em_revisao_em: datetime | None
    fechada_em: datetime
    resultado: str
    dias_ate_corrigir: int


@dataclass(frozen=True, kw_only=True)
class FiltrosCorrecoesConcluidas:
    projeto_id: UUID
    corretor_id: UUID | None = None
    resultado: str | None = None
    # Intervalo do dia em que a tentativa fechou, em UTC sem fuso.
    inicio: datetime | None = None
    fim: datetime | None = None
