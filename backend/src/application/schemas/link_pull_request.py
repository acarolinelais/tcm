from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator

from src.application.schemas.caso_teste import timestamp_utc
from src.domain.entities.link_pull_request import LinkPullRequest
from src.domain.queries.link_pull_request_com_autor import LinkPullRequestComAutor


class AdicionarLinkPullRequestRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    url: str

    # A regra é do domínio (spec 030, RN-02); validar aqui devolve 422 antes de chegar ao service.
    @field_validator("url")
    @classmethod
    def validar_url(cls, url: str) -> str:
        return LinkPullRequest.normalizar_url(url)


class LinkPullRequestResponse(BaseModel):
    id: UUID
    caso_teste_id: UUID
    url: str
    created_at: datetime | None
    created_by: UUID
    created_by_nome: str


class LinksPullRequestResponse(BaseModel):
    itens: list[LinkPullRequestResponse]
    # Calculado no backend: a regra de gestão depende do escopo do time (spec 030, RN-04).
    pode_remover: bool


def to_response(item: LinkPullRequestComAutor) -> LinkPullRequestResponse:
    link = item.link
    return LinkPullRequestResponse(
        id=link.id,
        caso_teste_id=link.caso_teste_id,
        url=link.url,
        created_at=timestamp_utc(link.created_at),
        created_by=link.created_by,
        created_by_nome=item.autor_nome,
    )
