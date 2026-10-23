"""substitui o papel KP no vínculo pelo perfil da conta"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d1e2f3a4b5c6"
down_revision: str | Sequence[str] | None = "c0d1e2f3a4b5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text(
            "UPDATE usuarios AS usuario SET perfil_id = kp.id, "
            "auth_version = usuario.auth_version + 1 "
            "FROM perfis AS atual, perfis AS kp "
            "WHERE atual.id = usuario.perfil_id "
            "AND atual.unidade_id = usuario.unidade_id "
            "AND atual.codigo = 'USUARIO_PADRAO' "
            "AND kp.unidade_id = usuario.unidade_id AND kp.codigo = 'KP' "
            "AND EXISTS (SELECT 1 FROM time_membros membro "
            "WHERE membro.usuario_id = usuario.id AND membro.unidade_id = usuario.unidade_id "
            "AND membro.ativo IS TRUE AND membro.papel = 'kp')"
        )
    )
    op.drop_column("time_membros", "papel")


def downgrade() -> None:
    op.add_column(
        "time_membros",
        sa.Column("papel", sa.String(length=10), server_default="dev", nullable=False),
    )
    bind = op.get_bind()
    bind.execute(
        sa.text(
            "UPDATE time_membros membro SET papel = 'kp' "
            "FROM usuarios usuario, perfis perfil "
            "WHERE usuario.id = membro.usuario_id AND perfil.id = usuario.perfil_id "
            "AND perfil.unidade_id = usuario.unidade_id AND perfil.codigo = 'KP'"
        )
    )
