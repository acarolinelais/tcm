"""Dev Fix do Test Case e correção concluída pela importação SDF (spec 072)"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "g072a1b2c3d4"
down_revision: str | Sequence[str] | None = "g071a1b2c3d4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "casos_teste",
        sa.Column(
            "dev_fix_id",
            sa.Uuid(),
            sa.ForeignKey("usuarios.id", name="fk_casos_teste_dev_fix_id_usuarios"),
            nullable=True,
        ),
    )
    op.add_column("casos_teste", sa.Column("dev_fix_em", sa.DateTime(), nullable=True))
    op.add_column(
        "importacoes_sdf_status",
        sa.Column("concluiu_correcao", sa.Boolean(), server_default="false", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("importacoes_sdf_status", "concluiu_correcao")
    op.drop_column("casos_teste", "dev_fix_em")
    op.drop_column("casos_teste", "dev_fix_id")
