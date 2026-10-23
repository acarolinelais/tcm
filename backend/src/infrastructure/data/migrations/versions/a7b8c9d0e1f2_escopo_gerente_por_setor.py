"""adiciona associação setor-gerente e perfil de sistema gerente"""

from collections.abc import Sequence
from uuid import uuid4

import sqlalchemy as sa
from alembic import op

revision: str = "a7b8c9d0e1f2"
down_revision: str | Sequence[str] | None = "f60718293041"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "setor_gerentes",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("unidade_id", sa.Uuid(), nullable=False),
        sa.Column("setor_id", sa.Uuid(), nullable=False),
        sa.Column("usuario_id", sa.Uuid(), nullable=False),
        sa.Column("ativo", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["unidade_id"], ["unidades.id"]),
        sa.ForeignKeyConstraint(["setor_id"], ["setores.id"]),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("setor_id", "usuario_id", name="uq_setor_gerentes_pair"),
    )
    op.create_index(
        "ix_setor_gerentes_unidade_usuario_ativo",
        "setor_gerentes",
        ["unidade_id", "usuario_id", "ativo"],
    )
    op.create_index(
        "ix_setor_gerentes_unidade_setor_ativo",
        "setor_gerentes",
        ["unidade_id", "setor_id", "ativo"],
    )

    bind = op.get_bind()
    unidades = bind.execute(sa.text("SELECT id FROM unidades")).scalars().all()
    for unidade_id in unidades:
        perfil_id = uuid4()
        bind.execute(
            sa.text(
                "INSERT INTO perfis (id, unidade_id, nome, descricao, codigo) "
                "VALUES (:id, :unidade_id, 'Gerente', "
                "'Gerencia times dos setores associados.', 'GERENTE')"
            ),
            {"id": perfil_id, "unidade_id": unidade_id},
        )
        bind.execute(
            sa.text(
                "INSERT INTO perfil_permissoes (perfil_id, permissao_id) "
                "SELECT :perfil_id, id FROM permissoes "
                "WHERE id IN ('times.consultar', 'times.criar', 'times.gerenciar')"
            ),
            {"perfil_id": perfil_id},
        )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(sa.text("DELETE FROM setor_gerentes"))
    bind.execute(
        sa.text(
            "UPDATE usuarios SET perfil_id = (SELECT padrao.id FROM perfis padrao "
            "WHERE padrao.unidade_id = usuarios.unidade_id AND padrao.codigo = 'USUARIO_PADRAO') "
            "WHERE perfil_id IN (SELECT id FROM perfis WHERE codigo = 'GERENTE')"
        )
    )
    bind.execute(
        sa.text(
            "DELETE FROM perfil_permissoes WHERE perfil_id IN "
            "(SELECT id FROM perfis WHERE codigo = 'GERENTE')"
        )
    )
    bind.execute(sa.text("DELETE FROM perfis WHERE codigo = 'GERENTE'"))
    op.drop_index("ix_setor_gerentes_unidade_setor_ativo", table_name="setor_gerentes")
    op.drop_index("ix_setor_gerentes_unidade_usuario_ativo", table_name="setor_gerentes")
    op.drop_table("setor_gerentes")
