"""persiste o nome editável do projeto"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d7e8f901a2b3"
down_revision: str | Sequence[str] | None = "c6d7e8f901a2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("projetos", sa.Column("nome", sa.String(length=150), nullable=True))
    op.execute("UPDATE projetos SET nome = app || ' ' || one_ui")
    op.alter_column("projetos", "nome", nullable=False)


def downgrade() -> None:
    op.drop_column("projetos", "nome")
