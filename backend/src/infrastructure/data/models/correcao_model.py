from datetime import datetime
from uuid import UUID

from sqlalchemy import ForeignKey, Index, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from src.infrastructure.data.base import Base


class CorrecaoModel(Base):
    """Tentativa de correção de um Test Case (spec 076)."""

    __tablename__ = "correcoes"

    __table_args__ = (
        Index("ix_correcoes_unidade_caso_ativo", "unidade_id", "caso_teste_id", "ativo"),
        Index("ix_correcoes_unidade_corretor_fechada", "unidade_id", "corretor_id", "fechada_em"),
        # Uma linha por tentativa do caso; a desfeita fica inativa e não conta.
        Index(
            "uq_correcoes_caso_tentativa_ativa",
            "caso_teste_id",
            "tentativa",
            unique=True,
            postgresql_where=text("ativo"),
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True)
    unidade_id: Mapped[UUID] = mapped_column(ForeignKey("unidades.id"), nullable=False)
    caso_teste_id: Mapped[UUID] = mapped_column(ForeignKey("casos_teste.id"), nullable=False)
    tentativa: Mapped[int] = mapped_column(nullable=False)
    origem: Mapped[str] = mapped_column(String(20), nullable=False)
    falha_em: Mapped[datetime] = mapped_column(nullable=False)
    em_revisao_em: Mapped[datetime | None] = mapped_column(nullable=True)
    fechada_em: Mapped[datetime | None] = mapped_column(nullable=True)
    resultado: Mapped[str | None] = mapped_column(String(20), nullable=True)
    corretor_id: Mapped[UUID | None] = mapped_column(ForeignKey("usuarios.id"), nullable=True)
    aberta_por_importacao_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("importacoes_sdf.id"), nullable=True
    )
    fechada_por_importacao_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("importacoes_sdf.id"), nullable=True
    )
    ativo: Mapped[bool] = mapped_column(default=True, server_default="true", nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(onupdate=func.now())
