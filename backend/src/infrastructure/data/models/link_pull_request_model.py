from datetime import datetime
from uuid import UUID

from sqlalchemy import ForeignKey, Index, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from src.domain.entities.link_pull_request import LinkPullRequest
from src.infrastructure.data.base import Base


class LinkPullRequestModel(Base):
    __tablename__ = "links_pull_request"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    unidade_id: Mapped[UUID] = mapped_column(ForeignKey("unidades.id"), nullable=False)
    caso_teste_id: Mapped[UUID] = mapped_column(ForeignKey("casos_teste.id"), nullable=False)
    url: Mapped[str] = mapped_column(String(LinkPullRequest.URL_MAX_LENGTH), nullable=False)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    ativo: Mapped[bool] = mapped_column(default=True, server_default="true", nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(onupdate=func.now())

    __table_args__ = (
        Index("ix_links_pull_request_unidade_caso", "unidade_id", "caso_teste_id"),
        # Só os ativos contam para a duplicidade: um link removido pode voltar (spec 030, RN-05).
        Index(
            "uq_links_pull_request_caso_url_ativo",
            "caso_teste_id",
            "url",
            unique=True,
            postgresql_where=text("ativo"),
        ),
    )
