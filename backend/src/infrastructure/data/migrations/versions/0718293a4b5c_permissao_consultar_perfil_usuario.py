"""adiciona permissão para consultar o perfil atribuído a usuários do escopo"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0718293a4b5c"
down_revision: str | Sequence[str] | None = "d1e2f3a4b5c6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text(
            "INSERT INTO permissoes (id, descricao) VALUES "
            "('usuarios.perfil.consultar', "
            "'Consultar o perfil atribuído a usuários no escopo permitido')"
        )
    )
    bind.execute(
        sa.text(
            "INSERT INTO perfil_permissoes (perfil_id, permissao_id) "
            "SELECT perfis.id, 'usuarios.perfil.consultar' FROM perfis "
            "WHERE perfis.codigo IN ('ADMIN_UNIDADE', 'GERENTE') "
            "AND NOT EXISTS (SELECT 1 FROM perfil_permissoes pp "
            "WHERE pp.perfil_id = perfis.id "
            "AND pp.permissao_id = 'usuarios.perfil.consultar')"
        )
    )
    bind.execute(
        sa.text(
            "UPDATE usuarios SET auth_version = auth_version + 1 "
            "WHERE perfil_id IN (SELECT id FROM perfis "
            "WHERE codigo IN ('ADMIN_UNIDADE', 'GERENTE'))"
        )
    )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text(
            "DELETE FROM perfil_permissoes WHERE permissao_id = 'usuarios.perfil.consultar'"
        )
    )
    bind.execute(sa.text("DELETE FROM permissoes WHERE id = 'usuarios.perfil.consultar'"))
