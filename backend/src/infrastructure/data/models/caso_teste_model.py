from datetime import datetime
from uuid import UUID

from sqlalchemy import CheckConstraint, ForeignKey, SmallInteger, String, UniqueConstraint, func
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
    automation_level: Mapped[int | None] = mapped_column(SmallInteger)
    situation: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    responsavel_id: Mapped[UUID] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    backup_id: Mapped[UUID | None] = mapped_column(ForeignKey("usuarios.id"))
    # Spec 072: quem corrige as falhas do SDF, e desde quando (UTC sem fuso).
    dev_fix_id: Mapped[UUID | None] = mapped_column(ForeignKey("usuarios.id"))
    dev_fix_em: Mapped[datetime | None] = mapped_column()
    # Spec 073: tentativa de correção e quando a tentativa atual entrou em In Review (UTC sem fuso).
    tentativa_correcao: Mapped[int] = mapped_column(default=0, server_default="0", nullable=False)
    correcao_em_revisao_em: Mapped[datetime | None] = mapped_column()
    justificativa_exclusao: Mapped[str | None] = mapped_column(
        String(CasoTeste.JUSTIFICATIVA_EXCLUSAO_MAX_LENGTH)
    )
    title: Mapped[str | None] = mapped_column(String(CasoTeste.TITLE_MAX_LENGTH))
    precondition: Mapped[str | None] = mapped_column(String(CasoTeste.TEXTO_MAX_LENGTH))
    procedure: Mapped[str | None] = mapped_column(String(CasoTeste.TEXTO_MAX_LENGTH))
    expected_result: Mapped[str | None] = mapped_column(String(CasoTeste.TEXTO_MAX_LENGTH))
    # Spec 065: gravadas pelo sistema, em UTC sem fuso.
    code_done_em: Mapped[datetime | None] = mapped_column()
    all_passed_em: Mapped[datetime | None] = mapped_column()
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
            "automation_level IS NULL OR automation_level IN (1, 2, 3)",
            name="ck_casos_teste_automation_level",
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
