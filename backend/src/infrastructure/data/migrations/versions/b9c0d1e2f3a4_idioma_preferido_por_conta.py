"""adiciona idioma preferido à conta"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b9c0d1e2f3a4"
down_revision: str | Sequence[str] | None = "b8c9d0e1f2a3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "usuarios",
        sa.Column("idioma_preferido", sa.String(length=5), nullable=False, server_default="en"),
    )
    op.create_check_constraint(
        "ck_usuarios_idioma_preferido",
        "usuarios",
        "idioma_preferido IN ('en', 'pt-BR', 'ko')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_usuarios_idioma_preferido", "usuarios", type_="check")
    op.drop_column("usuarios", "idioma_preferido")
