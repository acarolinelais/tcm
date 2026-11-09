"""Links de PR do Test Case (histórico 1:N, remoção lógica)"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d030a1b2c3d4"
down_revision: str | Sequence[str] | None = "c028a1b2c3d4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "links_pull_request",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("unidade_id", sa.Uuid(), nullable=False),
        sa.Column("caso_teste_id", sa.Uuid(), nullable=False),
        sa.Column("url", sa.String(length=2000), nullable=False),
        sa.Column("created_by", sa.Uuid(), nullable=False),
        sa.Column("ativo", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["caso_teste_id"], ["casos_teste.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["usuarios.id"]),
        sa.ForeignKeyConstraint(["unidade_id"], ["unidades.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_links_pull_request_unidade_caso",
        "links_pull_request",
        ["unidade_id", "caso_teste_id"],
    )
    op.create_index(
        "uq_links_pull_request_caso_url_ativo",
        "links_pull_request",
        ["caso_teste_id", "url"],
        unique=True,
        postgresql_where=sa.text("ativo"),
    )


def downgrade() -> None:
    op.drop_index("uq_links_pull_request_caso_url_ativo", table_name="links_pull_request")
    op.drop_index("ix_links_pull_request_unidade_caso", table_name="links_pull_request")
    op.drop_table("links_pull_request")
