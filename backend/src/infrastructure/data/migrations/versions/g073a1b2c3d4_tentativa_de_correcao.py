"""Tentativa e End Date da correção do Test Case e tentativa de cada execução SDF (spec 073)"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "g073a1b2c3d4"
down_revision: str | Sequence[str] | None = "g072a1b2c3d4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Os casos que já estão em correção começam na tentativa 1: os que estão em In Fixes e os que já têm
# Dev Fix e seguem no fluxo da correção. As execuções antigas ficam sem tentativa e contam como a 1.
RETROATIVO = """
UPDATE casos_teste SET tentativa_correcao = 1
WHERE ativo
  AND (status = 'InFixes'
       OR (dev_fix_id IS NOT NULL AND status IN ('InProgress', 'InReview', 'InValidation')))
"""

# Colunas que a auditoria ignora: as da spec 065 e, nesta, as duas calculadas da correção.
IGNORADAS_065 = ["updated_at", "code_done_em", "all_passed_em"]
IGNORADAS_073 = [*IGNORADAS_065, "tentativa_correcao", "correcao_em_revisao_em"]


def _ativar_auditoria(ignoradas: list[str]) -> None:
    op.execute(f"SELECT auditoria_ativar('casos_teste', ARRAY{ignoradas})")


def upgrade() -> None:
    op.add_column(
        "casos_teste",
        sa.Column("tentativa_correcao", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column("casos_teste", sa.Column("correcao_em_revisao_em", sa.DateTime(), nullable=True))
    op.add_column("execucoes_sdf", sa.Column("tentativa_correcao", sa.Integer(), nullable=True))
    # Calculadas pelo sistema, como as datas da spec 065: não entram no histórico nem na Timeline.
    # Religar antes do retroativo também evita uma linha de auditoria por caso.
    _ativar_auditoria(IGNORADAS_073)
    op.execute(RETROATIVO)


def downgrade() -> None:
    _ativar_auditoria(IGNORADAS_065)
    op.drop_column("execucoes_sdf", "tentativa_correcao")
    op.drop_column("casos_teste", "correcao_em_revisao_em")
    op.drop_column("casos_teste", "tentativa_correcao")
