from datetime import datetime
from uuid import UUID

from sqlalchemy import ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from src.infrastructure.data.base import Base


class ProjetoModeloModel(Base):
    __tablename__ = "projeto_modelos"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    unidade_id: Mapped[UUID] = mapped_column(ForeignKey("unidades.id"), nullable=False)
    projeto_id: Mapped[UUID] = mapped_column(ForeignKey("projetos.id"), nullable=False)
    modelo_dispositivo_id: Mapped[UUID] = mapped_column(
        ForeignKey("modelos_dispositivo.id"), nullable=False
    )
    ativo: Mapped[bool] = mapped_column(default=True, server_default="true", nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("projeto_id", "modelo_dispositivo_id", name="uq_projeto_modelos_pair"),
    )
