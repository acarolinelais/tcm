from datetime import datetime
from uuid import UUID

from sqlalchemy import ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from src.infrastructure.data.base import Base


class AuthSessaoModel(Base):
    __tablename__ = "auth_sessoes"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    usuario_id: Mapped[UUID] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"))
    refresh_hash: Mapped[str] = mapped_column(String(64))
    auth_version: Mapped[int] = mapped_column()
    expires_at: Mapped[datetime] = mapped_column()
    revoked_at: Mapped[datetime | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
