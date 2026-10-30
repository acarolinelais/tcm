"""adiciona cor do avatar à conta (ADR 0043)"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "e036a1b2c3d4"
down_revision: str | Sequence[str] | None = "d030a1b2c3d4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "usuarios",
        sa.Column("cor_avatar", sa.String(length=10), nullable=False, server_default="azul"),
    )
    op.create_check_constraint(
        "ck_usuarios_cor_avatar",
        "usuarios",
        "cor_avatar IN ('azul', 'indigo', 'roxo', 'rosa', 'vermelho', 'laranja', 'verde', 'cinza')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_usuarios_cor_avatar", "usuarios", type_="check")
    op.drop_column("usuarios", "cor_avatar")
