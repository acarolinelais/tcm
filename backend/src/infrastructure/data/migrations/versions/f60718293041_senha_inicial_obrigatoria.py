"""marca senha inicial para troca no primeiro acesso"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "f60718293041"
down_revision: str | Sequence[str] | None = "e5f607182930"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "usuarios",
        sa.Column(
            "senha_alteracao_obrigatoria",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    op.drop_column("usuarios", "senha_alteracao_obrigatoria")
