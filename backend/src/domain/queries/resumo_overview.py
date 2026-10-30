from dataclasses import dataclass, field
from uuid import UUID


@dataclass(frozen=True)
class EscopoOverview:
    """Quais casos a Overview conta (spec 039, RN-01)."""

    time_ids: tuple[UUID, ...] | None = None  # None: a unidade inteira.
    pessoa_id: UUID | None = None  # Só os casos em que a pessoa é principal ou Backup.


@dataclass(frozen=True)
class ResumoOverview:
    total: int = 0
    concluidos: int = 0
    em_andamento: int = 0
    a_fazer: int = 0
    atribuidos: int = 0
    # Mês "AAAA-MM" no fuso pedido → casos que entraram em Done nele. Mês sem registro não aparece.
    concluidos_por_mes: dict[str, int] = field(default_factory=dict)
