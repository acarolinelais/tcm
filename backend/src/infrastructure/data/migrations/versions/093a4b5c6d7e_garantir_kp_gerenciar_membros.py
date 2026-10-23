"""garante que KP possa gerenciar membros dos próprios times"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "093a4b5c6d7e"
down_revision: str | Sequence[str] | None = "08293a4b5c6d"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inseridos = bind.execute(
        sa.text(
            "INSERT INTO perfil_permissoes (perfil_id, permissao_id) "
            "SELECT perfis.id, 'times.gerenciar' FROM perfis "
            "WHERE perfis.codigo = 'KP' "
            "AND NOT EXISTS (SELECT 1 FROM perfil_permissoes pp "
            "WHERE pp.perfil_id = perfis.id AND pp.permissao_id = 'times.gerenciar') "
            "RETURNING perfil_id"
        )
    ).scalars().all()
    if inseridos:
        bind.execute(
            sa.text(
                "UPDATE usuarios SET auth_version = auth_version + 1 "
                "WHERE perfil_id IN :perfil_ids"
            ).bindparams(sa.bindparam("perfil_ids", expanding=True)),
            {"perfil_ids": inseridos},
        )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text(
            "DELETE FROM perfil_permissoes "
            "WHERE permissao_id = 'times.gerenciar' "
            "AND perfil_id IN (SELECT id FROM perfis WHERE codigo = 'KP')"
        )
    )
