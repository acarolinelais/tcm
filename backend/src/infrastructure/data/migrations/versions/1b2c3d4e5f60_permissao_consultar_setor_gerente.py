"""permite que gerentes consultem seus setores associados"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "1b2c3d4e5f60"
down_revision: str | Sequence[str] | None = "0a4b5c6d7e8f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text(
            "INSERT INTO perfil_permissoes (perfil_id, permissao_id) "
            "SELECT perfis.id, permissoes.id FROM perfis "
            "CROSS JOIN permissoes "
            "WHERE perfis.codigo = 'GERENTE' "
            "AND permissoes.id = 'setores.consultar' "
            "AND NOT EXISTS (SELECT 1 FROM perfil_permissoes pp "
            "WHERE pp.perfil_id = perfis.id AND pp.permissao_id = permissoes.id)"
        )
    )
    bind.execute(
        sa.text(
            "UPDATE usuarios SET auth_version = auth_version + 1 "
            "WHERE perfil_id IN (SELECT id FROM perfis WHERE codigo = 'GERENTE')"
        )
    )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text(
            "DELETE FROM perfil_permissoes "
            "WHERE permissao_id = 'setores.consultar' "
            "AND perfil_id IN (SELECT id FROM perfis WHERE codigo = 'GERENTE')"
        )
    )
