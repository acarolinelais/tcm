from datetime import datetime
from uuid import UUID

from sqlalchemy import ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from src.infrastructure.data.base import Base


class SetorGerenteModel(Base):
    __tablename__ = "setor_gerentes"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    unidade_id: Mapped[UUID] = mapped_column(ForeignKey("unidades.id"), nullable=False)
    setor_id: Mapped[UUID] = mapped_column(ForeignKey("setores.id"), nullable=False)
    usuario_id: Mapped[UUID] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    ativo: Mapped[bool] = mapped_column(default=True, server_default="true", nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(onupdate=func.now())

    __table_args__ = (UniqueConstraint("setor_id", "usuario_id", name="uq_setor_gerentes_pair"),)
