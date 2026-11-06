from datetime import datetime
from uuid import UUID

from sqlalchemy import ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from src.domain.entities.execucao_sdf import ExecucaoSdf
from src.infrastructure.data.base import Base


class ExecucaoSdfModel(Base):
    __tablename__ = "execucoes_sdf"

    __table_args__ = (
        Index("ix_execucoes_sdf_unidade_importacao", "unidade_id", "importacao_sdf_id"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True)
    unidade_id: Mapped[UUID] = mapped_column(ForeignKey("unidades.id"), nullable=False)
    importacao_sdf_id: Mapped[UUID] = mapped_column(
        ForeignKey("importacoes_sdf.id"), nullable=False
    )
    caso_teste_id: Mapped[UUID] = mapped_column(ForeignKey("casos_teste.id"), nullable=False)
    sdf_id: Mapped[str] = mapped_column(String(ExecucaoSdf.SDF_ID_MAX_LENGTH), nullable=False)
    data_reportada: Mapped[datetime] = mapped_column(nullable=False)
    one_ui: Mapped[str] = mapped_column(String(ExecucaoSdf.ONE_UI_MAX_LENGTH), nullable=False)
    ativo: Mapped[bool] = mapped_column(default=True, server_default="true", nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(onupdate=func.now())
