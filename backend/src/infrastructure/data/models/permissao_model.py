from uuid import UUID

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from src.infrastructure.data.base import Base


class PermissaoModel(Base):
    __tablename__ = "permissoes"

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    descricao: Mapped[str] = mapped_column(String(200))


class PerfilPermissaoModel(Base):
    __tablename__ = "perfil_permissoes"

    perfil_id: Mapped[UUID] = mapped_column(
        ForeignKey("perfis.id", ondelete="CASCADE"), primary_key=True
    )
    permissao_id: Mapped[str] = mapped_column(ForeignKey("permissoes.id"), primary_key=True)
