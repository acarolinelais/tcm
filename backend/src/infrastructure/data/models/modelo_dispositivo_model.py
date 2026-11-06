from datetime import datetime
from uuid import UUID

from sqlalchemy import ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from src.domain.entities.modelo_dispositivo import ModeloDispositivo
from src.infrastructure.data.base import Base


class ModeloDispositivoModel(Base):
    __tablename__ = "modelos_dispositivo"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    unidade_id: Mapped[UUID] = mapped_column(ForeignKey("unidades.id"), nullable=False)
    nome: Mapped[str] = mapped_column(String(ModeloDispositivo.NOME_MAX_LENGTH), nullable=False)
    ativo: Mapped[bool] = mapped_column(default=True, server_default="true", nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("unidade_id", "nome", name="uq_modelos_dispositivo_unidade_nome"),
    )
