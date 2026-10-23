from datetime import datetime
from uuid import UUID

from sqlalchemy import ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from src.infrastructure.data.base import Base


class PerfilModel(Base):
    __tablename__ = "perfis"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    unidade_id: Mapped[UUID] = mapped_column(ForeignKey("unidades.id"))
    nome: Mapped[str] = mapped_column(String(100))
    descricao: Mapped[str | None] = mapped_column(String(300), nullable=True)
    codigo: Mapped[str | None] = mapped_column(String(40), nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    __table_args__ = (UniqueConstraint("unidade_id", "nome", name="uq_perfis_unidade_nome"),)
