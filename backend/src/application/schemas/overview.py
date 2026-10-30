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
