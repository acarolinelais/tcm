from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class PontoDesempenhoResponse(BaseModel):
    mes: str  # AAAA-MM, no fuso pedido.
    concluidos: int


class OverviewResponse(BaseModel):
    total: int
    concluidos: int
    em_andamento: int
    a_fazer: int
    atribuidos: int
    desempenho: list[PontoDesempenhoResponse]


# Spec 063: gráficos do escopo de times.


class ProjetoOverviewResponse(BaseModel):
    id: UUID
    nome: str
    app: str


class CriacaoProjetoResponse(BaseModel):
    projeto_id: UUID
    projeto: str
    media: float  # Test Cases criados por dia nos últimos 30 dias.


class ConcluidosDevResponse(BaseModel):
    usuario_id: UUID
    nome: str
    concluidos: int


class ConcluidosSemanaResponse(BaseModel):
    semana: str  # Segunda-feira, AAAA-MM-DD, no fuso pedido.
    concluidos: int


class DoneProjetoResponse(BaseModel):
    projeto_id: UUID
    projeto: str
    concluidos: int
    total: int


class OverviewTimeResponse(BaseModel):
    projetos: list[ProjetoOverviewResponse]
    criacao_por_dia: list[CriacaoProjetoResponse]
    concluidos_por_dev: list[ConcluidosDevResponse]
    concluidos_por_semana: list[ConcluidosSemanaResponse]
    done_por_projeto: list[DoneProjetoResponse]


# Spec 063: projeto escolhido (burndown e Pass Rate) e visão pessoal.


class PontoBurndownResponse(BaseModel):
    dia: str  # AAAA-MM-DD, no fuso pedido.
    planejado: int
    executado: int


class PassRateModeloResponse(BaseModel):
    modelo_id: UUID
    modelo: str
    aprovados: int  # Resultados PASS.
    total: int


class PassRateResponse(BaseModel):
    rodada_em: datetime
    modelos: list[PassRateModeloResponse]


class OverviewProjetoResponse(BaseModel):
    burndown: list[PontoBurndownResponse]
    pass_rate: PassRateResponse | None  # None: o projeto não tem rodada de Form Factor.


class EntregasDiaResponse(BaseModel):
    dia: str  # AAAA-MM-DD, no fuso pedido.
    concluidos: int


class OverviewPessoalResponse(BaseModel):
    concluidos: int
    atribuidos: int
    por_dificuldade: dict[str, int]  # Low, Medium e High, sempre os três.
    entregas_por_dia: list[EntregasDiaResponse]
    entregas_por_semana: list[ConcluidosSemanaResponse]
