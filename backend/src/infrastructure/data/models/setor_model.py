from datetime import datetime
from uuid import UUID

from sqlalchemy import ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from src.domain.entities.setor import Setor
from src.infrastructure.data.base import Base


class SetorModel(Base):
    __tablename__ = "setores"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    unidade_id: Mapped[UUID] = mapped_column(ForeignKey("unidades.id"))
    nome: Mapped[str] = mapped_column(String(Setor.NOME_MAX_LENGTH))
    ativo: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(onupdate=func.now())
