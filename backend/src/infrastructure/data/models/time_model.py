from datetime import datetime
from uuid import UUID

from sqlalchemy import ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from src.domain.entities.time import Time
from src.infrastructure.data.base import Base


class TimeModel(Base):
    __tablename__ = "times"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    unidade_id: Mapped[UUID] = mapped_column(ForeignKey("unidades.id"))
    setor_id: Mapped[UUID] = mapped_column(ForeignKey("setores.id"))
    nome: Mapped[str] = mapped_column(String(Time.NOME_MAX_LENGTH))
    gerente_id: Mapped[UUID | None] = mapped_column(ForeignKey("usuarios.id"))
    ativo: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(onupdate=func.now())
