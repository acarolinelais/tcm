from datetime import datetime
from uuid import UUID

from sqlalchemy import ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from src.domain.entities.usuario import Usuario
from src.infrastructure.data.base import Base


class UsuarioModel(Base):
    __tablename__ = "usuarios"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    unidade_id: Mapped[UUID] = mapped_column(ForeignKey("unidades.id"))
    nome: Mapped[str] = mapped_column(String(Usuario.NOME_MAX_LENGTH))
    email: Mapped[str] = mapped_column(String(Usuario.EMAIL_MAX_LENGTH))
    senha_hash: Mapped[str | None] = mapped_column(String(255))
    admin_unidade: Mapped[bool] = mapped_column(default=False)
    ativo: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(onupdate=func.now())

    __table_args__ = (UniqueConstraint("email", name="uq_usuarios_email"),)
