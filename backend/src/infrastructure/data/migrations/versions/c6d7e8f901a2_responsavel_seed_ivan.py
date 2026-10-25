"""atribui o gerente Ivan como responsável pelos usuários seed SVP"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c6d7e8f901a2"
down_revision: str | Sequence[str] | None = "b5c6d7e8f901"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

USER_IDS = (
    "a.fagundes",
    "maria.pernalete",
    "caroline.silva",
    "raquel.batista",
    "isabel.gama",
    "nivea.pereira",
    "victoria.andrade",
    "janderson.brandao",
    "gilmar.silva",
    "marcio.marques",
    "guilherme.rabaioli",
)


def upgrade() -> None:
    query = sa.text(
        "UPDATE usuarios AS seed_usuario "
        "SET responsavel_id = gerente.id "
        "FROM usuarios AS gerente "
        "JOIN unidades ON unidades.id = gerente.unidade_id "
        "WHERE gerente.user_id = 'ivan.moreira' "
        "AND lower(unidades.nome) = 'manaus' "
        "AND seed_usuario.unidade_id = gerente.unidade_id "
        "AND seed_usuario.user_id IN :user_ids"
    ).bindparams(sa.bindparam("user_ids", expanding=True))
    op.get_bind().execute(query, {"user_ids": USER_IDS})


def downgrade() -> None:
    query = sa.text(
        "UPDATE usuarios AS seed_usuario "
        "SET responsavel_id = NULL "
        "FROM usuarios AS gerente "
        "JOIN unidades ON unidades.id = gerente.unidade_id "
        "WHERE gerente.user_id = 'ivan.moreira' "
        "AND lower(unidades.nome) = 'manaus' "
        "AND seed_usuario.unidade_id = gerente.unidade_id "
        "AND seed_usuario.responsavel_id = gerente.id "
        "AND seed_usuario.user_id IN :user_ids"
    ).bindparams(sa.bindparam("user_ids", expanding=True))
    op.get_bind().execute(query, {"user_ids": USER_IDS})
