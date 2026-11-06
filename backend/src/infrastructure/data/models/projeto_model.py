from datetime import datetime
from uuid import UUID

from sqlalchemy import ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from src.domain.entities.projeto import Projeto, StatusProjeto
from src.infrastructure.data.base import Base


class ProjetoModel(Base):
    __tablename__ = "projetos"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    unidade_id: Mapped[UUID] = mapped_column(ForeignKey("unidades.id"), nullable=False)
    time_id: Mapped[UUID] = mapped_column(ForeignKey("times.id"), nullable=False)
    nome: Mapped[str] = mapped_column(String(Projeto.NOME_MAX_LENGTH), nullable=False)
    app: Mapped[str] = mapped_column(String(Projeto.APP_MAX_LENGTH), nullable=False)
    one_ui: Mapped[str] = mapped_column(String(Projeto.ONE_UI_MAX_LENGTH), nullable=False)
    status: Mapped[str] = mapped_column(
        String(Projeto.STATUS_MAX_LENGTH),
        default=StatusProjeto.CREATED.value,
        server_default=StatusProjeto.CREATED.value,
        nullable=False,
    )
    ativo: Mapped[bool] = mapped_column(default=True, server_default="true", nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(onupdate=func.now())

    __table_args__ = (Index("ix_projetos_unidade_time", "unidade_id", "time_id"),)
