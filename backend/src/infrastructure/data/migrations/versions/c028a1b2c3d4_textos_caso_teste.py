"""Title, Precondition, Procedure e Expected Result do Test Case (textos opcionais da planilha)"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c028a1b2c3d4"
down_revision: str | Sequence[str] | None = "a0b1c2d3e4f5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Mesmos limites de CasoTeste; o VARCHAR(n) do Postgres conta caracteres, então dispensa check.
COLUNAS = {"title": 500, "precondition": 10_000, "procedure": 10_000, "expected_result": 10_000}


def upgrade() -> None:
    # Sem default nem backfill: os casos existentes ficam sem os textos.
    for nome, tamanho in COLUNAS.items():
        op.add_column("casos_teste", sa.Column(nome, sa.String(tamanho), nullable=True))


def downgrade() -> None:
    for nome in COLUNAS:
        op.drop_column("casos_teste", nome)
