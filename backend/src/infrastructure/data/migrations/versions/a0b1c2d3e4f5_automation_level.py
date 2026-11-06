"""Automation Level do Test Case (inteiro opcional de 1 a 3)"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a0b1c2d3e4f5"
down_revision: str | Sequence[str] | None = "a1b2c3d4e5f8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

CHECK = "automation_level IS NULL OR automation_level IN (1, 2, 3)"


def upgrade() -> None:
    # Sem default nem backfill: os casos existentes ficam sem nível.
    op.add_column("casos_teste", sa.Column("automation_level", sa.SmallInteger(), nullable=True))
    op.create_check_constraint("ck_casos_teste_automation_level", "casos_teste", CHECK)


def downgrade() -> None:
    op.drop_constraint("ck_casos_teste_automation_level", "casos_teste", type_="check")
    op.drop_column("casos_teste", "automation_level")
