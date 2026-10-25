"""status InValidation do Test Case, entre InReview e Pass"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b3c4d5e6f708"
down_revision: str | Sequence[str] | None = "a2b3c4d5e6f7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

STATUS = "status IN ('To-Do', 'InProgress', 'InReview', 'InValidation', 'Pass', 'Fail')"
STATUS_ANTERIOR = "status IN ('To-Do', 'InProgress', 'InReview', 'Pass', 'Fail')"


def upgrade() -> None:
    # "InValidation" tem 12 caracteres: a coluna precisa crescer antes de aceitar o valor.
    op.alter_column(
        "casos_teste", "status", type_=sa.String(length=20), existing_type=sa.String(length=10)
    )
    op.drop_constraint("ck_casos_teste_status", "casos_teste", type_="check")
    op.create_check_constraint("ck_casos_teste_status", "casos_teste", STATUS)


def downgrade() -> None:
    # Volta para o Status anterior mais próximo, que cabe no CHECK e na coluna antigos.
    op.execute("UPDATE casos_teste SET status = 'InReview' WHERE status = 'InValidation'")
    op.drop_constraint("ck_casos_teste_status", "casos_teste", type_="check")
    op.create_check_constraint("ck_casos_teste_status", "casos_teste", STATUS_ANTERIOR)
    op.alter_column(
        "casos_teste", "status", type_=sa.String(length=10), existing_type=sa.String(length=20)
    )
