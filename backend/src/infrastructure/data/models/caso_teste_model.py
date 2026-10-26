from datetime import datetime
from uuid import UUID

from sqlalchemy import CheckConstraint, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from src.domain.entities.caso_teste import CasoTeste
from src.infrastructure.data.base import Base


class CasoTesteModel(Base):
    __tablename__ = "casos_teste"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    unidade_id: Mapped[UUID] = mapped_column(ForeignKey("unidades.id"), nullable=False)
    projeto_id: Mapped[UUID] = mapped_column(ForeignKey("projetos.id"), nullable=False)
    tc_id: Mapped[str] = mapped_column(String(CasoTeste.TC_ID_MAX_LENGTH), nullable=False)
    category: Mapped[str] = mapped_column(String(1), nullable=False)
    difficulty: Mapped[str] = mapped_column(String(10), nullable=False)
    situation: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    responsavel_id: Mapped[UUID] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    backup_id: Mapped[UUID | None] = mapped_column(ForeignKey("usuarios.id"))
    ativo: Mapped[bool] = mapped_column(default=True, server_default="true", nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("projeto_id", "tc_id", name="uq_casos_teste_projeto_tc_id"),
        CheckConstraint("category IN ('A', 'B', 'C')", name="ck_casos_teste_category"),
        CheckConstraint(
            "difficulty IN ('Low', 'Medium', 'High')", name="ck_casos_teste_difficulty"
        ),
        CheckConstraint(
            "situation IN ('New', 'New Step', 'Without Changes')",
            name="ck_casos_teste_situation",
        ),
        CheckConstraint(
            "status IN ('To-Do', 'InProgress', 'InReview', 'InValidation', 'Done', 'InFixes', "
            "'Cancelled')",
            name="ck_casos_teste_status",
        ),
        CheckConstraint(
            "backup_id IS NULL OR responsavel_id <> backup_id",
            name="ck_casos_teste_responsavel_backup_distintos",
        ),
    )
