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
class Andamento:
    """Test Cases de um time ou setor por etapa (spec 064, RN-02 e RN-08)."""

    id: UUID
    nome: str
    a_fazer: int
    em_andamento: int
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
    # Spec 064: só times e setores ativos com Test Cases, em ordem alfabética.
    andamento_por_time: list[Andamento] = field(default_factory=list)
    andamento_por_setor: list[Andamento] = field(default_factory=list)
    em_correcao_por_projeto: dict[UUID, int] = field(default_factory=dict)  # Só os com 1 ou mais.
    # RN-12: em andamento (In Progress, In Review, In Validation e In Fixes) por projeto.
    em_andamento_por_projeto: dict[UUID, int] = field(default_factory=dict)
    # Projeto → (PASS, total) da rodada mais recente; projeto sem rodada não aparece.
    pass_rate_por_projeto: dict[UUID, tuple[int, int]] = field(default_factory=dict)


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
class ProjetoPessoal:
    """Os Test Cases da pessoa num projeto (spec 064, RN-12: os cards do dev)."""

    projeto_id: UUID
    projeto: str
    app: str
    concluidos: int
    em_andamento: int
    atribuidos: int


@dataclass(frozen=True)
class ResumoPessoal:
    """Test Cases em que a pessoa é a responsável principal (spec 063, RN-14 a RN-16)."""

    concluidos: int = 0
    atribuidos: int = 0
    por_dificuldade: dict[str, int] = field(default_factory=dict)
    # Dia "AAAA-MM-DD" no fuso pedido → casos com a última entrada em Done nele.
    concluidos_por_dia: dict[str, int] = field(default_factory=dict)
    # Projetos em que a pessoa é a responsável principal, em ordem alfabética.
    por_projeto: list[ProjetoPessoal] = field(default_factory=list)
