from dataclasses import dataclass, field
from datetime import datetime
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


@dataclass(frozen=True)
class ProjetoOverview:
    id: UUID
    nome: str
    app: str


@dataclass(frozen=True)
class ConcluidosDev:
    usuario_id: UUID
    nome: str
    concluidos: int


@dataclass(frozen=True)
class ResumoTime:
    """Gráficos do escopo de times (spec 063, RN-09 a RN-12). Sem registro, o item não aparece."""

    projetos: list[ProjetoOverview] = field(default_factory=list)  # Ativos, em ordem alfabética.
    criados_por_projeto: dict[UUID, int] = field(default_factory=dict)  # Desde `desde_dia`.
    concluidos_por_dev: list[ConcluidosDev] = field(default_factory=list)
    concluidos_por_semana: dict[str, int] = field(default_factory=dict)  # Segunda "AAAA-MM-DD".
    # Projeto → (Done, total), sem os Excluded.
    done_por_projeto: dict[UUID, tuple[int, int]] = field(default_factory=dict)


@dataclass(frozen=True)
class PassRateModelo:
    modelo_id: UUID
    modelo: str
    aprovados: int  # Resultados PASS.
    total: int


@dataclass(frozen=True)
class PassRate:
    """Resultados por modelo na rodada de Form Factor mais recente do projeto (spec 063, RN-08)."""

    rodada_em: datetime
    modelos: list[PassRateModelo]


@dataclass(frozen=True)
class ResumoPessoal:
    """Test Cases em que a pessoa é a responsável principal (spec 063, RN-14 a RN-16)."""

    concluidos: int = 0
    atribuidos: int = 0
    por_dificuldade: dict[str, int] = field(default_factory=dict)
    # Dia "AAAA-MM-DD" no fuso pedido → casos com a última entrada em Done nele.
    concluidos_por_dia: dict[str, int] = field(default_factory=dict)
