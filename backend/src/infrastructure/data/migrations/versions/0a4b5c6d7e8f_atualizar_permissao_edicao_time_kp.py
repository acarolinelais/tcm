"""atualiza o escopo de edição de times e renova sessões KP"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0a4b5c6d7e8f"
down_revision: str | Sequence[str] | None = "093a4b5c6d7e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text(
            "UPDATE permissoes SET descricao = "
            "'Editar times e gerenciar membros no escopo permitido' "
            "WHERE id = 'times.gerenciar'"
        )
    )
    bind.execute(
        sa.text(
            "UPDATE usuarios SET auth_version = auth_version + 1 "
            "WHERE perfil_id IN (SELECT id FROM perfis WHERE codigo = 'KP')"
        )
    )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text(
            "UPDATE permissoes SET descricao = 'Gerenciar membros e papéis dos times' "
            "WHERE id = 'times.gerenciar'"
        )
    )
