from datetime import datetime
from uuid import UUID

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from src.domain.entities.execucao_sdf import ExecucaoSdf
from src.infrastructure.data.base import Base


class ExecucaoSdfModel(Base):
    __tablename__ = "execucoes_sdf"

    __table_args__ = (
        Index("ix_execucoes_sdf_unidade_importacao", "unidade_id", "importacao_sdf_id"),
        UniqueConstraint("rodada_id", "caso_teste_id", name="uq_execucoes_sdf_rodada_caso"),
        CheckConstraint(
            "(origem = 'SDF' AND importacao_sdf_id IS NOT NULL AND sdf_id IS NOT NULL) OR "
            "(origem = 'MANUAL' AND importacao_sdf_id IS NULL AND "
            "((rodada_id IS NULL AND sdf_id IS NULL) OR rodada_id IS NOT NULL))",
            name="ck_execucoes_sdf_origem",
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True)
    unidade_id: Mapped[UUID] = mapped_column(ForeignKey("unidades.id"), nullable=False)
    importacao_sdf_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("importacoes_sdf.id"), nullable=True
    )
    rodada_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("rodadas_form_factor.id"), nullable=True
    )
    resultados_registrados: Mapped[bool] = mapped_column(
        default=False, server_default="false", nullable=False
    )
    caso_teste_id: Mapped[UUID] = mapped_column(ForeignKey("casos_teste.id"), nullable=False)
    sdf_id: Mapped[str | None] = mapped_column(String(ExecucaoSdf.SDF_ID_MAX_LENGTH), nullable=True)
    data_reportada: Mapped[datetime] = mapped_column(nullable=False)
    # Spec 073: tentativa de correção do caso quando a execução entrou; nula nas anteriores.
    tentativa_correcao: Mapped[int | None] = mapped_column()
    one_ui: Mapped[str] = mapped_column(String(ExecucaoSdf.ONE_UI_MAX_LENGTH), nullable=False)
    origem: Mapped[str] = mapped_column(
        String(ExecucaoSdf.ORIGEM_MAX_LENGTH),
        default="SDF",
        server_default="SDF",
        nullable=False,
    )
    ativo: Mapped[bool] = mapped_column(default=True, server_default="true", nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(onupdate=func.now())
