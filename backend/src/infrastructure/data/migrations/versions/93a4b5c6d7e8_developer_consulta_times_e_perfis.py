"""concede ao perfil developer a consulta de times e do perfil dos usuários no escopo"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "93a4b5c6d7e8"
down_revision: str | Sequence[str] | None = "8293a4b5c6d7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

PERMISSOES = ("times.consultar", "usuarios.perfil.consultar")


def _invalidar_sessoes(bind: sa.Connection) -> None:
    # As permissões viajam no JWT: incrementar auth_version força a renovação do token.
    bind.execute(
        sa.text(
            "UPDATE usuarios SET auth_version = auth_version + 1 WHERE perfil_id IN "
            "(SELECT id FROM perfis WHERE codigo = 'USUARIO_PADRAO')"
        )
    )


def upgrade() -> None:
    bind = op.get_bind()
    for permissao in PERMISSOES:
        bind.execute(
            sa.text(
                "INSERT INTO perfil_permissoes (perfil_id, permissao_id) "
                "SELECT perfil.id, permissao.id FROM perfis perfil "
                "CROSS JOIN permissoes permissao "
                "WHERE perfil.codigo = 'USUARIO_PADRAO' AND permissao.id = :permissao "
                "AND NOT EXISTS (SELECT 1 FROM perfil_permissoes pp "
                "WHERE pp.perfil_id = perfil.id AND pp.permissao_id = permissao.id)"
            ),
            {"permissao": permissao},
        )
    _invalidar_sessoes(bind)


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text(
            "DELETE FROM perfil_permissoes WHERE permissao_id IN :permissoes "
            "AND perfil_id IN (SELECT id FROM perfis WHERE codigo = 'USUARIO_PADRAO')"
        ).bindparams(sa.bindparam("permissoes", expanding=True)),
        {"permissoes": list(PERMISSOES)},
    )
    _invalidar_sessoes(bind)
