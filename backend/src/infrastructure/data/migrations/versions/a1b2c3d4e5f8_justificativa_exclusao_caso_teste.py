"""justificativa da exclusão do Test Case (spec 026)"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f8"
down_revision: str | Sequence[str] | None = "f901a2b3c4d5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Os TCs já excluídos ficam sem justificativa (RN-07).
    op.add_column(
        "casos_teste", sa.Column("justificativa_exclusao", sa.String(length=500), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("casos_teste", "justificativa_exclusao")
