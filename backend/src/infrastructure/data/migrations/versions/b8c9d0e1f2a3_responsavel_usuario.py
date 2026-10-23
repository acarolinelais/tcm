"""vincula usuários criados por gerentes ao responsável"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b8c9d0e1f2a3"
down_revision: str | Sequence[str] | None = "a7b8c9d0e1f2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("usuarios", sa.Column("responsavel_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "fk_usuarios_responsavel_id_usuarios",
        "usuarios",
        "usuarios",
        ["responsavel_id"],
        ["id"],
    )
    op.create_index("ix_usuarios_responsavel_id", "usuarios", ["responsavel_id"])

    bind = op.get_bind()
    bind.execute(
        sa.text(
            "INSERT INTO perfil_permissoes (perfil_id, permissao_id) "
            "SELECT perfis.id, permissoes.id FROM perfis CROSS JOIN permissoes "
            "WHERE perfis.codigo = 'GERENTE' AND permissoes.id IN "
            "('usuarios.consultar', 'usuarios.gerenciar') "
            "AND NOT EXISTS (SELECT 1 FROM perfil_permissoes pp "
            "WHERE pp.perfil_id = perfis.id AND pp.permissao_id = permissoes.id)"
        )
    )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text(
            "DELETE FROM perfil_permissoes WHERE permissao_id IN "
            "('usuarios.consultar', 'usuarios.gerenciar') AND perfil_id IN "
            "(SELECT id FROM perfis WHERE codigo = 'GERENTE')"
        )
    )
    op.drop_index("ix_usuarios_responsavel_id", table_name="usuarios")
    op.drop_constraint("fk_usuarios_responsavel_id_usuarios", "usuarios", type_="foreignkey")
    op.drop_column("usuarios", "responsavel_id")
