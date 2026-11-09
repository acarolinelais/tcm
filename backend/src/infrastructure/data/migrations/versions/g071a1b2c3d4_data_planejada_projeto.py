"""data planejada do projeto (spec 071)"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "g071a1b2c3d4"
down_revision: str | Sequence[str] | None = "g067a1b2c3d4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("projetos", sa.Column("data_planejada", sa.Date(), nullable=True))
    op.add_column("projetos", sa.Column("planejamento_iniciado_em", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("projetos", "planejamento_iniciado_em")
    op.drop_column("projetos", "data_planejada")
