from datetime import datetime
from uuid import UUID

from sqlalchemy import ForeignKey, Index, func
from sqlalchemy.orm import Mapped, mapped_column

from src.infrastructure.data.base import Base


class ImportacaoSdfModel(Base):
    __tablename__ = "importacoes_sdf"

    __table_args__ = (
        Index("ix_importacoes_sdf_unidade_projeto", "unidade_id", "projeto_id", "created_at"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True)
    unidade_id: Mapped[UUID] = mapped_column(ForeignKey("unidades.id"), nullable=False)
    projeto_id: Mapped[UUID] = mapped_column(ForeignKey("projetos.id"), nullable=False)
    importado_por: Mapped[UUID] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    ativo: Mapped[bool] = mapped_column(default=True, server_default="true", nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(onupdate=func.now())
