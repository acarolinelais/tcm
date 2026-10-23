"""substitui admin_unidade por perfis de sistema e exige perfil"""

from collections.abc import Sequence
from uuid import uuid4

import sqlalchemy as sa
from alembic import op

revision: str = "e5f607182930"
down_revision: str | Sequence[str] | None = "d4e5f6071829"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("perfis", sa.Column("codigo", sa.String(40), nullable=True))
    bind = op.get_bind()
    unidades = bind.execute(sa.text("SELECT id FROM unidades")).scalars().all()

    for unidade_id in unidades:
        perfil_admin_id, perfil_padrao_id = uuid4(), uuid4()
        bind.execute(
            sa.text(
                "INSERT INTO perfis (id, unidade_id, nome, descricao, codigo) "
                "VALUES (:id, :unidade_id, :nome, :descricao, :codigo)"
            ),
            [
                {
                    "id": perfil_admin_id,
                    "unidade_id": unidade_id,
                    "nome": "Administrador",
                    "descricao": "Acesso completo à unidade.",
                    "codigo": "ADMIN_UNIDADE",
                },
                {
                    "id": perfil_padrao_id,
                    "unidade_id": unidade_id,
                    "nome": "Usuário padrão",
                    "descricao": "Perfil padrão da unidade.",
                    "codigo": "USUARIO_PADRAO",
                },
            ],
        )
        bind.execute(
            sa.text(
                "INSERT INTO perfil_permissoes (perfil_id, permissao_id) "
                "SELECT :perfil_id, id FROM permissoes"
            ),
            {"perfil_id": perfil_admin_id},
        )
        bind.execute(
            sa.text(
                "INSERT INTO perfil_permissoes (perfil_id, permissao_id) "
                "SELECT :perfil_id, id FROM permissoes "
                "WHERE id IN ('usuarios.consultar', 'setores.consultar', 'times.consultar')"
            ),
            {"perfil_id": perfil_padrao_id},
        )
        bind.execute(
            sa.text(
                "UPDATE usuarios SET perfil_id = :perfil_id "
                "WHERE unidade_id = :unidade_id AND admin_unidade = true"
            ),
            {"perfil_id": perfil_admin_id, "unidade_id": unidade_id},
        )
        bind.execute(
            sa.text(
                "UPDATE usuarios SET perfil_id = :perfil_id "
                "WHERE unidade_id = :unidade_id AND perfil_id IS NULL"
            ),
            {"perfil_id": perfil_padrao_id, "unidade_id": unidade_id},
        )

    with op.batch_alter_table("usuarios") as batch:
        batch.alter_column("perfil_id", existing_type=sa.Uuid(), nullable=False)
        batch.drop_column("admin_unidade")


def downgrade() -> None:
    op.add_column(
        "usuarios",
        sa.Column("admin_unidade", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    bind = op.get_bind()
    bind.execute(
        sa.text(
            "UPDATE usuarios SET admin_unidade = true WHERE perfil_id IN "
            "(SELECT id FROM perfis WHERE codigo = 'ADMIN_UNIDADE')"
        )
    )
    with op.batch_alter_table("usuarios") as batch:
        batch.alter_column("perfil_id", existing_type=sa.Uuid(), nullable=True)
    bind.execute(
        sa.text(
            "UPDATE usuarios SET perfil_id = NULL WHERE perfil_id IN "
            "(SELECT id FROM perfis WHERE codigo IN ('ADMIN_UNIDADE', 'USUARIO_PADRAO'))"
        )
    )
    bind.execute(
        sa.text(
            "DELETE FROM perfil_permissoes WHERE perfil_id IN "
            "(SELECT id FROM perfis WHERE codigo IN ('ADMIN_UNIDADE', 'USUARIO_PADRAO'))"
        )
    )
    bind.execute(sa.text("DELETE FROM perfis WHERE codigo IN ('ADMIN_UNIDADE', 'USUARIO_PADRAO')"))
    op.drop_column("perfis", "codigo")
