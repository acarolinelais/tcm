"""separa o TC Situation (origem do caso) do Status (progresso) nos Test Cases"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "8293a4b5c6d7"
down_revision: str | Sequence[str] | None = "718293a4b5c6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

STATUS = "status IN ('To-Do', 'InProgress', 'InReview', 'Pass', 'Fail')"
SITUATION = "situation IN ('New', 'New Step', 'Without Changes')"
SITUATION_ANTIGA = "situation IN ('To-Do', 'InProgress', 'InReview', 'Pass', 'Fail')"


def upgrade() -> None:
    # O progresso que estava em `situation` passa para `status` sem perder valores.
    op.drop_constraint("ck_casos_teste_situation", "casos_teste", type_="check")
    op.alter_column("casos_teste", "situation", new_column_name="status")
    op.create_check_constraint("ck_casos_teste_status", "casos_teste", STATUS)
    # Os casos existentes recebem New; depois o valor passa a ser sempre informado.
    op.add_column(
        "casos_teste",
        sa.Column("situation", sa.String(length=20), nullable=False, server_default="New"),
    )
    op.alter_column("casos_teste", "situation", server_default=None)
    op.create_check_constraint("ck_casos_teste_situation", "casos_teste", SITUATION)


def downgrade() -> None:
    op.drop_constraint("ck_casos_teste_situation", "casos_teste", type_="check")
    op.drop_column("casos_teste", "situation")
    op.drop_constraint("ck_casos_teste_status", "casos_teste", type_="check")
    op.alter_column("casos_teste", "status", new_column_name="situation")
    op.create_check_constraint("ck_casos_teste_situation", "casos_teste", SITUATION_ANTIGA)
