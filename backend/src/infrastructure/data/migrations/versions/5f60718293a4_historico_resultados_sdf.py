"""preserva histórico de importações e resultados SDF"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "5f60718293a4"
down_revision: str | Sequence[str] | None = "4e5f60718293"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "importacoes_sdf",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("unidade_id", sa.Uuid(), nullable=False),
        sa.Column("projeto_id", sa.Uuid(), nullable=False),
        sa.Column("importado_por", sa.Uuid(), nullable=False),
        sa.Column("ativo", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["importado_por"], ["usuarios.id"]),
        sa.ForeignKeyConstraint(["projeto_id"], ["projetos.id"]),
        sa.ForeignKeyConstraint(["unidade_id"], ["unidades.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_importacoes_sdf_unidade_projeto",
        "importacoes_sdf",
        ["unidade_id", "projeto_id", "created_at"],
    )
    op.create_table(
        "execucoes_sdf",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("unidade_id", sa.Uuid(), nullable=False),
        sa.Column("importacao_sdf_id", sa.Uuid(), nullable=False),
        sa.Column("caso_teste_id", sa.Uuid(), nullable=False),
        sa.Column("sdf_id", sa.String(length=120), nullable=False),
        sa.Column("data_reportada", sa.DateTime(), nullable=False),
        sa.Column("one_ui", sa.String(length=40), nullable=False),
        sa.Column("ativo", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["caso_teste_id"], ["casos_teste.id"]),
        sa.ForeignKeyConstraint(["importacao_sdf_id"], ["importacoes_sdf.id"]),
        sa.ForeignKeyConstraint(["unidade_id"], ["unidades.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_execucoes_sdf_unidade_importacao",
        "execucoes_sdf",
        ["unidade_id", "importacao_sdf_id"],
    )
    op.create_table(
        "resultados_form_factor",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("unidade_id", sa.Uuid(), nullable=False),
        sa.Column("execucao_sdf_id", sa.Uuid(), nullable=False),
        sa.Column("modelo_dispositivo_id", sa.Uuid(), nullable=False),
        sa.Column("resultado", sa.String(length=40), nullable=False),
        sa.Column("ativo", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["execucao_sdf_id"], ["execucoes_sdf.id"]),
        sa.ForeignKeyConstraint(["modelo_dispositivo_id"], ["modelos_dispositivo.id"]),
        sa.ForeignKeyConstraint(["unidade_id"], ["unidades.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "execucao_sdf_id",
            "modelo_dispositivo_id",
            name="uq_resultados_form_factor_execucao_modelo",
        ),
    )
    op.create_index(
        "ix_resultados_form_factor_unidade_execucao",
        "resultados_form_factor",
        ["unidade_id", "execucao_sdf_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_resultados_form_factor_unidade_execucao", table_name="resultados_form_factor")
    op.drop_table("resultados_form_factor")
    op.drop_index("ix_execucoes_sdf_unidade_importacao", table_name="execucoes_sdf")
    op.drop_table("execucoes_sdf")
    op.drop_index("ix_importacoes_sdf_unidade_projeto", table_name="importacoes_sdf")
    op.drop_table("importacoes_sdf")
