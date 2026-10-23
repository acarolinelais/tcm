"""multitenancy e autenticacao

Revision ID: b2c3d4e5f607
Revises: a1b2c3d4e5f6
Create Date: 2026-10-22 00:00:00.000000

"""

from collections.abc import Sequence
from uuid import uuid4

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f607"
down_revision: str | Sequence[str] | None = "a1b2c3d4e5f6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "unidades",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("nome", sa.String(length=150), nullable=False),
        sa.Column("ativo", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    op.add_column("usuarios", sa.Column("unidade_id", sa.Uuid(), nullable=True))
    op.add_column("usuarios", sa.Column("senha_hash", sa.String(length=255), nullable=True))
    op.add_column(
        "usuarios",
        sa.Column("admin_unidade", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_foreign_key("fk_usuarios_unidade_id", "usuarios", "unidades", ["unidade_id"], ["id"])

    bind = op.get_bind()
    if bind.execute(sa.text("SELECT 1 FROM usuarios LIMIT 1")).first() is not None:
        unidade_legada_id = uuid4()
        bind.execute(
            sa.text("INSERT INTO unidades (id, nome, ativo) VALUES (:id, :nome, true)"),
            {"id": unidade_legada_id, "nome": "Unidade legada"},
        )
        bind.execute(
            sa.text("UPDATE usuarios SET unidade_id = :id WHERE unidade_id IS NULL"),
            {"id": unidade_legada_id},
        )
    op.alter_column("usuarios", "unidade_id", nullable=False)

    op.create_table(
        "setores",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("unidade_id", sa.Uuid(), nullable=False),
        sa.Column("nome", sa.String(length=150), nullable=False),
        sa.Column("ativo", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["unidade_id"], ["unidades.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "times",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("unidade_id", sa.Uuid(), nullable=False),
        sa.Column("setor_id", sa.Uuid(), nullable=False),
        sa.Column("nome", sa.String(length=150), nullable=False),
        sa.Column("gerente_id", sa.Uuid(), nullable=True),
        sa.Column("ativo", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["unidade_id"], ["unidades.id"]),
        sa.ForeignKeyConstraint(["setor_id"], ["setores.id"]),
        sa.ForeignKeyConstraint(["gerente_id"], ["usuarios.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "time_membros",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("unidade_id", sa.Uuid(), nullable=False),
        sa.Column("time_id", sa.Uuid(), nullable=False),
        sa.Column("usuario_id", sa.Uuid(), nullable=False),
        sa.Column("papel", sa.String(length=10), nullable=False, server_default="dev"),
        sa.Column("ativo", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["unidade_id"], ["unidades.id"]),
        sa.ForeignKeyConstraint(["time_id"], ["times.id"]),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("time_id", "usuario_id", name="uq_time_membros_time_usuario"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("time_membros")
    op.drop_table("times")
    op.drop_table("setores")
    op.drop_constraint("fk_usuarios_unidade_id", "usuarios", type_="foreignkey")
    op.drop_column("usuarios", "admin_unidade")
    op.drop_column("usuarios", "senha_hash")
    op.drop_column("usuarios", "unidade_id")
    op.drop_table("unidades")
