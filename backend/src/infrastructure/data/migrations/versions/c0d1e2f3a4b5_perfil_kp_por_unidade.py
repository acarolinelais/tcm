"""adiciona perfil de sistema KP reutilizável por unidade"""

from collections.abc import Sequence
from uuid import uuid4

import sqlalchemy as sa
from alembic import op

revision: str = "c0d1e2f3a4b5"
down_revision: str | Sequence[str] | None = "b9c0d1e2f3a4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    unidades = bind.execute(sa.text("SELECT id FROM unidades")).scalars().all()

    for unidade_id in unidades:
        existente = bind.execute(
            sa.text("SELECT id FROM perfis WHERE unidade_id = :unidade_id AND codigo = 'KP'"),
            {"unidade_id": unidade_id},
        ).scalar_one_or_none()
        if existente is not None:
            continue

        perfil_padrao_id = bind.execute(
            sa.text(
                "SELECT id FROM perfis "
                "WHERE unidade_id = :unidade_id AND codigo = 'USUARIO_PADRAO'"
            ),
            {"unidade_id": unidade_id},
        ).scalar_one_or_none()
        if perfil_padrao_id is None:
            raise RuntimeError(f"Unidade {unidade_id} não possui perfil USUARIO_PADRAO.")

        perfil_kp_id = uuid4()
        bind.execute(
            sa.text(
                "INSERT INTO perfis (id, unidade_id, nome, descricao, codigo) "
                "VALUES (:id, :unidade_id, 'KP', "
                "'Perfil reutilizável para pessoas que exercem KP em times.', 'KP')"
            ),
            {"id": perfil_kp_id, "unidade_id": unidade_id},
        )
        bind.execute(
            sa.text(
                "INSERT INTO perfil_permissoes (perfil_id, permissao_id) "
                "SELECT :perfil_id, permissao_id FROM perfil_permissoes "
                "WHERE perfil_id = :perfil_padrao_id"
            ),
            {"perfil_id": perfil_kp_id, "perfil_padrao_id": perfil_padrao_id},
        )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text(
            "UPDATE usuarios SET perfil_id = ("
            "SELECT padrao.id FROM perfis padrao "
            "WHERE padrao.unidade_id = usuarios.unidade_id "
            "AND padrao.codigo = 'USUARIO_PADRAO'"
            "), auth_version = auth_version + 1 "
            "WHERE perfil_id IN (SELECT id FROM perfis WHERE codigo = 'KP')"
        )
    )
    bind.execute(
        sa.text(
            "DELETE FROM perfil_permissoes "
            "WHERE perfil_id IN (SELECT id FROM perfis WHERE codigo = 'KP')"
        )
    )
    bind.execute(sa.text("DELETE FROM perfis WHERE codigo = 'KP'"))
