"""adiciona Test Cases ao projeto"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "4e5f60718293"
down_revision: str | Sequence[str] | None = "3d4e5f607182"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "casos_teste",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("unidade_id", sa.Uuid(), nullable=False),
        sa.Column("projeto_id", sa.Uuid(), nullable=False),
        sa.Column("tc_id", sa.String(length=120), nullable=False),
        sa.Column("category", sa.String(length=1), nullable=False),
        sa.Column("difficulty", sa.String(length=10), nullable=False),
        sa.Column("situation", sa.String(length=10), nullable=False),
        sa.Column("responsavel_id", sa.Uuid(), nullable=False),
        sa.Column("backup_id", sa.Uuid(), nullable=True),
        sa.Column("ativo", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.CheckConstraint(
            "backup_id IS NULL OR responsavel_id <> backup_id",
            name="ck_casos_teste_responsavel_backup_distintos",
        ),
        sa.CheckConstraint("category IN ('A', 'B', 'C')", name="ck_casos_teste_category"),
        sa.CheckConstraint(
            "difficulty IN ('Low', 'Medium', 'High')", name="ck_casos_teste_difficulty"
        ),
        sa.CheckConstraint(
            "situation IN ('To-Do', 'InProgress', 'InReview', 'Pass', 'Fail')",
            name="ck_casos_teste_situation",
        ),
        sa.ForeignKeyConstraint(["backup_id"], ["usuarios.id"]),
        sa.ForeignKeyConstraint(["projeto_id"], ["projetos.id"]),
        sa.ForeignKeyConstraint(["responsavel_id"], ["usuarios.id"]),
        sa.ForeignKeyConstraint(["unidade_id"], ["unidades.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("projeto_id", "tc_id", name="uq_casos_teste_projeto_tc_id"),
    )


def downgrade() -> None:
    op.drop_table("casos_teste")
