"""catálogo de modelos de dispositivo: descrição, updated_at e gestão pelo KP"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a2b3c4d5e6f7"
down_revision: str | Sequence[str] | None = "f1a2b3c4d5e6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

PERMISSAO = "modelos_dispositivo.gerenciar"
DESCRICAO_PERMISSAO = "Cadastrar e gerenciar o catálogo de modelos de dispositivo"


def upgrade() -> None:
    op.add_column("modelos_dispositivo", sa.Column("descricao", sa.String(100), nullable=True))
    op.execute("UPDATE modelos_dispositivo SET updated_at = created_at WHERE updated_at IS NULL")
    op.alter_column("modelos_dispositivo", "updated_at", server_default=sa.func.now())

    bind = op.get_bind()
    bind.execute(
        sa.text(
            "INSERT INTO permissoes (id, descricao) VALUES (:id, :descricao) "
            "ON CONFLICT (id) DO NOTHING"
        ),
        {"id": PERMISSAO, "descricao": DESCRICAO_PERMISSAO},
    )
    perfis_kp = (
        bind.execute(
            sa.text(
                "INSERT INTO perfil_permissoes (perfil_id, permissao_id) "
                "SELECT perfis.id, permissoes.id FROM perfis "
                "CROSS JOIN permissoes "
                "WHERE perfis.codigo = 'KP' AND permissoes.id = :permissao "
                "AND NOT EXISTS (SELECT 1 FROM perfil_permissoes pp "
                "WHERE pp.perfil_id = perfis.id AND pp.permissao_id = permissoes.id) "
                "RETURNING perfil_id"
            ),
            {"permissao": PERMISSAO},
        )
        .scalars()
        .all()
    )
    # Mudança de acesso incrementa auth_version e invalida as sessões de quem a recebeu (ADR 0020).
    if perfis_kp:
        bind.execute(
            sa.text(
                "UPDATE usuarios SET auth_version = auth_version + 1 WHERE perfil_id IN :ids"
            ).bindparams(sa.bindparam("ids", expanding=True)),
            {"ids": tuple(perfis_kp)},
        )


def downgrade() -> None:
    bind = op.get_bind()
    perfis = (
        bind.execute(
            sa.text(
                "DELETE FROM perfil_permissoes WHERE permissao_id = :permissao RETURNING perfil_id"
            ),
            {"permissao": PERMISSAO},
        )
        .scalars()
        .all()
    )
    if perfis:
        bind.execute(
            sa.text(
                "UPDATE usuarios SET auth_version = auth_version + 1 WHERE perfil_id IN :ids"
            ).bindparams(sa.bindparam("ids", expanding=True)),
            {"ids": tuple(set(perfis))},
        )
    bind.execute(sa.text("DELETE FROM permissoes WHERE id = :permissao"), {"permissao": PERMISSAO})
    op.alter_column("modelos_dispositivo", "updated_at", server_default=None)
    op.drop_column("modelos_dispositivo", "descricao")
