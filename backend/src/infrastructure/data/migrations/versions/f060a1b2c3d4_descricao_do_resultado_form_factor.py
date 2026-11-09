"""descrição do resultado Form Factor, lida do relatório SDF (spec 060)"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "f060a1b2c3d4"
down_revision: str | Sequence[str] | None = "e038b1c2d3e4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Só acrescenta a coluna: os resultados que já existem ficam sem descrição.
    op.add_column("resultados_form_factor", sa.Column("descricao", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("resultados_form_factor", "descricao")
