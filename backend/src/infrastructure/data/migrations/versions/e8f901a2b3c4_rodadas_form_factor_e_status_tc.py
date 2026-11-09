"""rodadas Form Factor e novo ciclo de Status dos Test Cases"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "e8f901a2b3c4"
down_revision: str | Sequence[str] | None = "d7e8f901a2b3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "rodadas_form_factor",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("unidade_id", sa.Uuid(), nullable=False),
        sa.Column("projeto_id", sa.Uuid(), nullable=False),
        sa.Column("criada_por", sa.Uuid(), nullable=False),
        sa.Column("sdf_id", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("ativo", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.ForeignKeyConstraint(["criada_por"], ["usuarios.id"]),
        sa.ForeignKeyConstraint(["projeto_id"], ["projetos.id"]),
        sa.ForeignKeyConstraint(["unidade_id"], ["unidades.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.add_column("execucoes_sdf", sa.Column("rodada_id", sa.Uuid(), nullable=True))
    op.add_column(
        "execucoes_sdf",
        sa.Column(
            "resultados_registrados", sa.Boolean(), server_default=sa.false(), nullable=False
        ),
    )
    op.create_foreign_key(
        "fk_execucoes_sdf_rodada_id_rodadas_form_factor",
        "execucoes_sdf",
        "rodadas_form_factor",
        ["rodada_id"],
        ["id"],
    )
    op.create_unique_constraint(
        "uq_execucoes_sdf_rodada_caso", "execucoes_sdf", ["rodada_id", "caso_teste_id"]
    )
    # Bancos que aplicaram uma versão antiga de a4b5c6d7e8f9 não têm esta constraint.
    op.execute("ALTER TABLE execucoes_sdf DROP CONSTRAINT IF EXISTS ck_execucoes_sdf_origem")
    op.create_check_constraint(
        "ck_execucoes_sdf_origem",
        "execucoes_sdf",
        "(origem = 'SDF' AND importacao_sdf_id IS NOT NULL AND sdf_id IS NOT NULL "
        "AND rodada_id IS NULL) OR (origem = 'MANUAL' AND importacao_sdf_id IS NULL AND "
        "((rodada_id IS NULL AND sdf_id IS NULL) OR rodada_id IS NOT NULL))",
    )

    op.drop_constraint("ck_casos_teste_status", "casos_teste", type_="check")
    op.execute("UPDATE casos_teste SET status = 'Done' WHERE status = 'Pass'")
    op.execute("UPDATE casos_teste SET status = 'InReview' WHERE status = 'Fail'")
    op.create_check_constraint(
        "ck_casos_teste_status",
        "casos_teste",
        "status IN ('To-Do', 'InProgress', 'InReview', 'InValidation', 'Done', 'Cancelled')",
    )

    bind = op.get_bind()
    bind.execute(
        sa.text(
            "INSERT INTO permissoes (id, descricao) VALUES "
            "('form_factor.registrar', 'Criar rodadas e registrar resultados Form Factor')"
        )
    )
    bind.execute(
        sa.text(
            "INSERT INTO perfil_permissoes (perfil_id, permissao_id) "
            "SELECT perfil.id, 'form_factor.registrar' FROM perfis perfil "
            "WHERE perfil.codigo IN ('ADMIN_UNIDADE', 'GERENTE', 'KP', 'USUARIO_PADRAO')"
        )
    )
    bind.execute(
        sa.text(
            "UPDATE usuarios SET auth_version = auth_version + 1 WHERE perfil_id IN "
            "(SELECT id FROM perfis WHERE codigo IN "
            "('ADMIN_UNIDADE', 'GERENTE', 'KP', 'USUARIO_PADRAO'))"
        )
    )


def downgrade() -> None:
    bind = op.get_bind()
    op.drop_constraint("ck_casos_teste_status", "casos_teste", type_="check")
    bind.execute(sa.text("UPDATE casos_teste SET status = 'Pass' WHERE status = 'Done'"))
    bind.execute(sa.text("UPDATE casos_teste SET status = 'InReview' WHERE status = 'Cancelled'"))
    op.create_check_constraint(
        "ck_casos_teste_status",
        "casos_teste",
        "status IN ('To-Do', 'InProgress', 'InReview', 'InValidation', 'Pass', 'Fail')",
    )
    bind.execute(
        sa.text("DELETE FROM perfil_permissoes WHERE permissao_id = 'form_factor.registrar'")
    )
    bind.execute(sa.text("DELETE FROM permissoes WHERE id = 'form_factor.registrar'"))
    bind.execute(
        sa.text(
            "UPDATE usuarios SET auth_version = auth_version + 1 WHERE perfil_id IN "
            "(SELECT id FROM perfis WHERE codigo IN "
            "('ADMIN_UNIDADE', 'GERENTE', 'KP', 'USUARIO_PADRAO'))"
        )
    )
    op.drop_constraint("ck_execucoes_sdf_origem", "execucoes_sdf", type_="check")
    op.create_check_constraint(
        "ck_execucoes_sdf_origem",
        "execucoes_sdf",
        "(origem = 'SDF' AND importacao_sdf_id IS NOT NULL AND sdf_id IS NOT NULL) OR "
        "(origem = 'MANUAL' AND importacao_sdf_id IS NULL AND sdf_id IS NULL)",
    )
    op.drop_constraint(
        "fk_execucoes_sdf_rodada_id_rodadas_form_factor", "execucoes_sdf", type_="foreignkey"
    )
    op.drop_constraint("uq_execucoes_sdf_rodada_caso", "execucoes_sdf", type_="unique")
    op.drop_column("execucoes_sdf", "rodada_id")
    op.drop_column("execucoes_sdf", "resultados_registrados")
    op.drop_table("rodadas_form_factor")
