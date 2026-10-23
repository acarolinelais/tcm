"""adiciona projetos e modelos de dispositivo"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "3d4e5f607182"
down_revision: str | Sequence[str] | None = "2c3d4e5f6071"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "modelos_dispositivo",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("unidade_id", sa.Uuid(), nullable=False),
        sa.Column("nome", sa.String(length=100), nullable=False),
        sa.Column("ativo", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["unidade_id"], ["unidades.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("unidade_id", "nome", name="uq_modelos_dispositivo_unidade_nome"),
    )
    op.create_table(
        "projetos",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("unidade_id", sa.Uuid(), nullable=False),
        sa.Column("time_id", sa.Uuid(), nullable=False),
        sa.Column("app", sa.String(length=100), nullable=False),
        sa.Column("one_ui", sa.String(length=40), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="Created", nullable=False),
        sa.Column("ativo", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["time_id"], ["times.id"]),
        sa.ForeignKeyConstraint(["unidade_id"], ["unidades.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_projetos_unidade_time", "projetos", ["unidade_id", "time_id"])
    op.create_table(
        "projeto_modelos",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("unidade_id", sa.Uuid(), nullable=False),
        sa.Column("projeto_id", sa.Uuid(), nullable=False),
        sa.Column("modelo_dispositivo_id", sa.Uuid(), nullable=False),
        sa.Column("ativo", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["modelo_dispositivo_id"], ["modelos_dispositivo.id"]),
        sa.ForeignKeyConstraint(["projeto_id"], ["projetos.id"]),
        sa.ForeignKeyConstraint(["unidade_id"], ["unidades.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("projeto_id", "modelo_dispositivo_id", name="uq_projeto_modelos_pair"),
    )


def downgrade() -> None:
    op.drop_table("projeto_modelos")
    op.drop_index("ix_projetos_unidade_time", table_name="projetos")
    op.drop_table("projetos")
    op.drop_table("modelos_dispositivo")
