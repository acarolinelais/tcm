"""perfis, permissoes e sessoes JWT"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d4e5f6071829"
down_revision: str | Sequence[str] | None = "c3d4e5f60718"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "perfis",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("unidade_id", sa.Uuid(), nullable=False),
        sa.Column("nome", sa.String(100), nullable=False),
        sa.Column("descricao", sa.String(300), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["unidade_id"], ["unidades.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("unidade_id", "nome", name="uq_perfis_unidade_nome"),
    )
    op.create_table(
        "permissoes",
        sa.Column("id", sa.String(80), nullable=False),
        sa.Column("descricao", sa.String(200), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "perfil_permissoes",
        sa.Column("perfil_id", sa.Uuid(), nullable=False),
        sa.Column("permissao_id", sa.String(80), nullable=False),
        sa.ForeignKeyConstraint(["perfil_id"], ["perfis.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["permissao_id"], ["permissoes.id"]),
        sa.PrimaryKeyConstraint("perfil_id", "permissao_id"),
    )
    op.create_table(
        "auth_sessoes",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("usuario_id", sa.Uuid(), nullable=False),
        sa.Column("refresh_hash", sa.String(64), nullable=False),
        sa.Column("auth_version", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.add_column("usuarios", sa.Column("perfil_id", sa.Uuid(), nullable=True))
    op.add_column(
        "usuarios", sa.Column("auth_version", sa.Integer(), server_default="0", nullable=False)
    )
    op.create_foreign_key("fk_usuarios_perfil_id", "usuarios", "perfis", ["perfil_id"], ["id"])
    op.bulk_insert(
        sa.table("permissoes", sa.column("id", sa.String), sa.column("descricao", sa.String)),
        [
            {"id": "usuarios.consultar", "descricao": "Consultar usuários no escopo permitido"},
            {"id": "usuarios.gerenciar", "descricao": "Criar e alterar usuários"},
            {"id": "setores.consultar", "descricao": "Consultar setores"},
            {"id": "setores.gerenciar", "descricao": "Criar e alterar setores"},
            {"id": "times.consultar", "descricao": "Consultar times no escopo permitido"},
            {"id": "times.criar", "descricao": "Criar times"},
            {"id": "times.gerenciar", "descricao": "Gerenciar membros e papéis dos times"},
            {"id": "perfis.gerenciar", "descricao": "Criar perfis e vincular permissões"},
        ],
    )


def downgrade() -> None:
    op.drop_constraint("fk_usuarios_perfil_id", "usuarios", type_="foreignkey")
    op.drop_column("usuarios", "auth_version")
    op.drop_column("usuarios", "perfil_id")
    op.drop_table("auth_sessoes")
    op.drop_table("perfil_permissoes")
    op.drop_table("permissoes")
    op.drop_table("perfis")
