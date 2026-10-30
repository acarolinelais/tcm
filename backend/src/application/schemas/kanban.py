from uuid import UUID

from pydantic import BaseModel

from src.domain.common.cor_avatar import CorAvatar
from src.domain.entities.caso_teste import (
    CategoriaCasoTeste,
    DificuldadeCasoTeste,
    SituacaoCasoTeste,
    StatusCasoTeste,
)
from src.domain.queries.caso_teste_com_responsavel import CasoTesteComResponsavel


class KanbanCardResponse(BaseModel):
    id: UUID
    tc_id: str
    category: CategoriaCasoTeste
    difficulty: DificuldadeCasoTeste
    situation: SituacaoCasoTeste
    responsavel_id: UUID
    responsavel_nome: str
    responsavel_cor_avatar: CorAvatar
    # Status para os quais quem consulta pode mover o card; vazio = só leitura.
    destinos: list[StatusCasoTeste]


class KanbanColunaResponse(BaseModel):
    status: StatusCasoTeste
    total: int
    casos: list[KanbanCardResponse]


class KanbanResponse(BaseModel):
    projeto_id: UUID
    total: int
    colunas: list[KanbanColunaResponse]


def to_kanban_response(
    projeto_id: UUID, por_status: dict[StatusCasoTeste, list[KanbanCardResponse]]
) -> KanbanResponse:
    colunas = [
        KanbanColunaResponse(status=status, total=len(casos), casos=casos)
        for status, casos in por_status.items()
    ]
    return KanbanResponse(
        projeto_id=projeto_id, total=sum(coluna.total for coluna in colunas), colunas=colunas
    )


def to_card_response(
    item: CasoTesteComResponsavel, destinos: list[StatusCasoTeste]
) -> KanbanCardResponse:
    caso = item.caso
    return KanbanCardResponse(
        id=caso.id,
        tc_id=caso.tc_id,
        category=caso.category,
        difficulty=caso.difficulty,
        situation=caso.situation,
        responsavel_id=caso.responsavel_id,
        responsavel_nome=item.responsavel_nome,
        responsavel_cor_avatar=item.responsavel_cor_avatar,
        destinos=destinos,
    )
