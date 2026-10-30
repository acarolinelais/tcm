from datetime import datetime
from uuid import UUID

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from src.domain.common.cor_avatar import CorAvatar
from src.domain.entities.usuario import Usuario
from src.infrastructure.data.base import Base


class UsuarioModel(Base):
    __tablename__ = "usuarios"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    unidade_id: Mapped[UUID] = mapped_column(ForeignKey("unidades.id"))
    nome: Mapped[str] = mapped_column(String(Usuario.NOME_MAX_LENGTH))
    email: Mapped[str] = mapped_column(String(Usuario.EMAIL_MAX_LENGTH))
    user_id: Mapped[str | None] = mapped_column(String(Usuario.USER_ID_MAX_LENGTH), nullable=True)
    senha_hash: Mapped[str | None] = mapped_column(String(255))
    senha_alteracao_obrigatoria: Mapped[bool] = mapped_column(default=False, server_default="false")
    perfil_id: Mapped[UUID] = mapped_column(ForeignKey("perfis.id"), nullable=False)
    responsavel_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("usuarios.id"), nullable=True, index=True
    )
    idioma_preferido: Mapped[str] = mapped_column(
        String(5), nullable=False, default="en", server_default="en"
    )
    cor_avatar: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default=CorAvatar.AZUL.value,
        server_default=CorAvatar.AZUL.value,
    )
    auth_version: Mapped[int] = mapped_column(default=0, server_default="0")
    ativo: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("email", name="uq_usuarios_email"),
        Index(
            "uq_usuarios_unidade_user_id_lower",
            "unidade_id",
            func.lower(user_id),
            unique=True,
            postgresql_where=user_id.is_not(None),
        ),
        CheckConstraint(
            "idioma_preferido IN ('en', 'pt-BR', 'ko')", name="ck_usuarios_idioma_preferido"
        ),
        CheckConstraint(
            f"cor_avatar IN ({', '.join(f"'{cor}'" for cor in CorAvatar)})",
            name="ck_usuarios_cor_avatar",
        ),
    )
