from datetime import datetime
from uuid import UUID

from sqlalchemy import ForeignKey, Index, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from src.domain.entities.resultado_form_factor import ResultadoFormFactor
from src.infrastructure.data.base import Base


class ResultadoFormFactorModel(Base):
    __tablename__ = "resultados_form_factor"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    unidade_id: Mapped[UUID] = mapped_column(ForeignKey("unidades.id"), nullable=False)
    execucao_sdf_id: Mapped[UUID] = mapped_column(ForeignKey("execucoes_sdf.id"), nullable=False)
    modelo_dispositivo_id: Mapped[UUID] = mapped_column(
        ForeignKey("modelos_dispositivo.id"), nullable=False
    )
    resultado: Mapped[str] = mapped_column(
        String(ResultadoFormFactor.RESULTADO_MAX_LENGTH), nullable=False
    )
    descricao: Mapped[str | None] = mapped_column(Text, nullable=True)
    ativo: Mapped[bool] = mapped_column(default=True, server_default="true", nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(onupdate=func.now())

    __table_args__ = (
        Index(
            "ix_resultados_form_factor_unidade_execucao",
            "unidade_id",
            "execucao_sdf_id",
        ),
        UniqueConstraint(
            "execucao_sdf_id",
            "modelo_dispositivo_id",
            name="uq_resultados_form_factor_execucao_modelo",
        ),
    )
