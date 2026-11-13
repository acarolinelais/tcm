from datetime import datetime
from uuid import UUID

from sqlalchemy import ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from src.infrastructure.data.base import Base


class ImportacaoSdfStatusModel(Base):
    __tablename__ = "importacoes_sdf_status"

    __table_args__ = (
        UniqueConstraint(
            "importacao_sdf_id", "caso_teste_id", name="uq_importacoes_sdf_status_caso"
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True)
    unidade_id: Mapped[UUID] = mapped_column(ForeignKey("unidades.id"), nullable=False)
    importacao_sdf_id: Mapped[UUID] = mapped_column(
        ForeignKey("importacoes_sdf.id"), nullable=False
    )
    caso_teste_id: Mapped[UUID] = mapped_column(ForeignKey("casos_teste.id"), nullable=False)
    status_aplicado: Mapped[str] = mapped_column(String(20), nullable=False)
    # Spec 076, RN-06: nulo nas importações antigas, que sempre partiam de In Validation.
    status_anterior: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # Spec 072, RN-08: o Done desta importação encerrou a correção do Dev Fix.
    concluiu_correcao: Mapped[bool] = mapped_column(
        default=False, server_default="false", nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
