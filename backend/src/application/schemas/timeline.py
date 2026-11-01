from collections.abc import Collection, Mapping, Sequence
from datetime import date, datetime
from uuid import UUID
from zoneinfo import ZoneInfo

from pydantic import BaseModel

from src.application.schemas.caso_teste import timestamp_utc
from src.application.schemas.historico_caso_teste import (
    AlteracaoCasoTesteResponse,
    alteracoes_response,
)
from src.domain.common.cor_avatar import CorAvatar
from src.domain.queries.registro_auditoria import RegistroTimeline


class PessoaTimelineResponse(BaseModel):
    id: UUID
    nome: str
    cor_avatar: CorAvatar


class CasoTimelineResponse(BaseModel):
    id: UUID
    tc_id: str
    title: str | None


class CardTimelineResponse(BaseModel):
    caso_teste_id: UUID
    tc_id: str
    responsavel_id: UUID
    responsavel_nome: str
    responsavel_cor_avatar: CorAvatar
    dia: date
    primeira_em: datetime
    alteracoes: list[AlteracaoCasoTesteResponse]


class TimelineResponse(BaseModel):
    pessoas: list[PessoaTimelineResponse]
    casos: list[CasoTimelineResponse]
    cards: list[CardTimelineResponse]


def to_timeline_response(
    registros: Sequence[RegistroTimeline],
    nomes: Mapping[UUID, str],
    fuso: ZoneInfo,
    responsavel_ids: Collection[UUID],
    caso_ids: Collection[UUID],
) -> TimelineResponse:
    """Um card por caso e dia no fuso de quem consulta, com o responsável atual (spec 054, RN-04).

    `registros` vem do mais recente para o mais antigo. Quem fez cada mudança fica nas alterações.
    Os filtros valem só para os cards: pessoas e casos são as opções dos filtros e a pilha de
    avatares (RN-07, RN-08).
    """
    pessoas: dict[UUID, PessoaTimelineResponse] = {}
    casos: dict[UUID, CasoTimelineResponse] = {}
    cards: dict[tuple[UUID, date], CardTimelineResponse] = {}
    for item in registros:
        alteracoes = alteracoes_response(item.registro, nomes)
        if not alteracoes:
            continue
        casos.setdefault(
            item.caso_teste_id,
            CasoTimelineResponse(id=item.caso_teste_id, tc_id=item.tc_id, title=item.title),
        )
        pessoas.setdefault(
            item.responsavel_id,
            PessoaTimelineResponse(
                id=item.responsavel_id,
                nome=item.responsavel_nome,
                cor_avatar=item.responsavel_cor_avatar,
            ),
        )
        if (responsavel_ids and item.responsavel_id not in responsavel_ids) or (
            caso_ids and item.caso_teste_id not in caso_ids
        ):
            continue
        criado_em = timestamp_utc(item.registro.created_at)
        chave = (item.caso_teste_id, criado_em.astimezone(fuso).date())
        card = cards.get(chave)
        if card is None:
            cards[chave] = CardTimelineResponse(
                caso_teste_id=item.caso_teste_id,
                tc_id=item.tc_id,
                responsavel_id=item.responsavel_id,
                responsavel_nome=item.responsavel_nome,
                responsavel_cor_avatar=item.responsavel_cor_avatar,
                dia=chave[1],
                primeira_em=criado_em,
                alteracoes=alteracoes,
            )
        else:
            card.alteracoes.extend(alteracoes)
            card.primeira_em = criado_em
    return TimelineResponse(
        pessoas=sorted(pessoas.values(), key=lambda p: p.nome.lower()),
        casos=sorted(casos.values(), key=lambda c: c.tc_id),
        cards=sorted(cards.values(), key=lambda c: c.primeira_em),
    )
