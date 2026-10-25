"""permite registrar execuções manuais de Form Factor"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a4b5c6d7e8f9"
down_revision: str | Sequence[str] | None = "b3c4d5e6f708"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "execucoes_sdf",
        sa.Column("origem", sa.String(length=20), server_default="SDF", nullable=False),
    )
    op.alter_column("execucoes_sdf", "importacao_sdf_id", nullable=True)
    op.alter_column("execucoes_sdf", "sdf_id", nullable=True)
    op.create_check_constraint(
        "ck_execucoes_sdf_origem",
        "execucoes_sdf",
        "(origem = 'SDF' AND importacao_sdf_id IS NOT NULL AND sdf_id IS NOT NULL) OR "
        "(origem = 'MANUAL' AND importacao_sdf_id IS NULL AND sdf_id IS NULL)",
    )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.execute(
        sa.text("SELECT EXISTS (SELECT 1 FROM execucoes_sdf WHERE origem = 'MANUAL')")
    ).scalar_one():
        raise RuntimeError("Não é possível reverter: existem rodadas manuais Form Factor.")
    op.drop_constraint("ck_execucoes_sdf_origem", "execucoes_sdf", type_="check")
    op.alter_column("execucoes_sdf", "sdf_id", nullable=False)
    op.alter_column("execucoes_sdf", "importacao_sdf_id", nullable=False)
    op.drop_column("execucoes_sdf", "origem")
