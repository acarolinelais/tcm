"""permite ao perfil developer consultar os resultados Form Factor"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "718293a4b5c6"
down_revision: str | Sequence[str] | None = "60718293a4b5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

PERMISSAO = "form_factor.consultar"
DESCRICAO_ANTERIOR = "Consulta projetos e Test Cases do time e atualiza apenas os TCs atribuídos."
DESCRICAO_NOVA = (
    "Consulta projetos, Test Cases e Form Factor do time e atualiza apenas os TCs atribuídos."
)


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
    bind.execute(
        sa.text(
            "INSERT INTO perfil_permissoes (perfil_id, permissao_id) "
            "SELECT perfil.id, permissao.id FROM perfis perfil "
            "CROSS JOIN permissoes permissao "
            "WHERE perfil.codigo = 'USUARIO_PADRAO' AND permissao.id = :permissao "
            "AND NOT EXISTS (SELECT 1 FROM perfil_permissoes pp "
            "WHERE pp.perfil_id = perfil.id AND pp.permissao_id = permissao.id)"
        ),
        {"permissao": PERMISSAO},
    )
    # Só troca a descrição que a migration anterior gravou; descrições editadas ficam como estão.
    bind.execute(
        sa.text(
            "UPDATE perfis SET descricao = :nova "
            "WHERE codigo = 'USUARIO_PADRAO' AND descricao = :anterior"
        ),
        {"nova": DESCRICAO_NOVA, "anterior": DESCRICAO_ANTERIOR},
    )
    _invalidar_sessoes(bind)


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text(
            "DELETE FROM perfil_permissoes WHERE permissao_id = :permissao "
            "AND perfil_id IN (SELECT id FROM perfis WHERE codigo = 'USUARIO_PADRAO')"
        ),
        {"permissao": PERMISSAO},
    )
    bind.execute(
        sa.text(
            "UPDATE perfis SET descricao = :anterior "
            "WHERE codigo = 'USUARIO_PADRAO' AND descricao = :nova"
        ),
        {"nova": DESCRICAO_NOVA, "anterior": DESCRICAO_ANTERIOR},
    )
    _invalidar_sessoes(bind)
