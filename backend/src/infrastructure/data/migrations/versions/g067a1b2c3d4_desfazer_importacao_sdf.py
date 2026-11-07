"""desfazer a última importação do relatório SDF (spec 067)"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "g067a1b2c3d4"
down_revision: str | Sequence[str] | None = "g065a1b2c3d4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "importacoes_sdf",
        sa.Column("desfeita_por", sa.Uuid(), sa.ForeignKey("usuarios.id"), nullable=True),
    )
    op.add_column("importacoes_sdf", sa.Column("desfeita_em", sa.DateTime(), nullable=True))
    op.create_table(
        "importacoes_sdf_status",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("unidade_id", sa.Uuid(), sa.ForeignKey("unidades.id"), nullable=False),
        sa.Column(
            "importacao_sdf_id", sa.Uuid(), sa.ForeignKey("importacoes_sdf.id"), nullable=False
        ),
        sa.Column("caso_teste_id", sa.Uuid(), sa.ForeignKey("casos_teste.id"), nullable=False),
        sa.Column("status_aplicado", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint(
            "importacao_sdf_id", "caso_teste_id", name="uq_importacoes_sdf_status_caso"
        ),
    )


def downgrade() -> None:
    op.drop_table("importacoes_sdf_status")
    op.drop_column("importacoes_sdf", "desfeita_em")
    op.drop_column("importacoes_sdf", "desfeita_por")
