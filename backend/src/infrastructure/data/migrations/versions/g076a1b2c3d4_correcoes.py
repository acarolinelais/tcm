"""Tentativas de correção do Test Case e Status anterior da importação SDF (spec 076)"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "g076a1b2c3d4"
down_revision: str | Sequence[str] | None = "g073a1b2c3d4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# RN-11: os casos em correção ganham a tentativa atual, aberta, com o dia da falha mais recente
# dela. As execuções sem tentativa são anteriores à spec 073 e contam como a 1. Sem falha
# registrada, vale a última mudança do caso. Tentativas já fechadas não são reconstruídas.
RETROATIVO = """
INSERT INTO correcoes (id, unidade_id, caso_teste_id, tentativa, origem, falha_em, em_revisao_em)
SELECT gen_random_uuid(), c.unidade_id, c.id, c.tentativa_correcao, 'validacao',
       COALESCE(
           (SELECT max(e.data_reportada)
            FROM execucoes_sdf e
            JOIN resultados_form_factor r ON r.execucao_sdf_id = e.id AND r.ativo
            LEFT JOIN importacoes_sdf i ON i.id = e.importacao_sdf_id
            WHERE e.caso_teste_id = c.id
              AND e.ativo
              AND (e.importacao_sdf_id IS NULL OR i.ativo)
              AND COALESCE(e.tentativa_correcao, 1) = c.tentativa_correcao
              AND COALESCE(upper(trim(r.resultado)), '') NOT IN ('PASS', 'N/A', 'NA', 'CHECK')),
           c.updated_at,
           c.created_at
       ),
       c.correcao_em_revisao_em
FROM casos_teste c
WHERE c.ativo
  AND c.tentativa_correcao > 0
  AND c.status IN ('InFixes', 'InProgress', 'InReview', 'InValidation')
"""


def upgrade() -> None:
    op.create_table(
        "correcoes",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("unidade_id", sa.Uuid(), nullable=False),
        sa.Column("caso_teste_id", sa.Uuid(), nullable=False),
        sa.Column("tentativa", sa.Integer(), nullable=False),
        sa.Column("origem", sa.String(20), nullable=False),
        sa.Column("falha_em", sa.DateTime(), nullable=False),
        sa.Column("em_revisao_em", sa.DateTime(), nullable=True),
        sa.Column("fechada_em", sa.DateTime(), nullable=True),
        sa.Column("resultado", sa.String(20), nullable=True),
        sa.Column("corretor_id", sa.Uuid(), nullable=True),
        sa.Column("aberta_por_importacao_id", sa.Uuid(), nullable=True),
        sa.Column("fechada_por_importacao_id", sa.Uuid(), nullable=True),
        sa.Column("ativo", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["unidade_id"], ["unidades.id"]),
        sa.ForeignKeyConstraint(["caso_teste_id"], ["casos_teste.id"]),
        sa.ForeignKeyConstraint(["corretor_id"], ["usuarios.id"]),
        sa.ForeignKeyConstraint(["aberta_por_importacao_id"], ["importacoes_sdf.id"]),
        sa.ForeignKeyConstraint(["fechada_por_importacao_id"], ["importacoes_sdf.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint("tentativa >= 1", name="ck_correcoes_tentativa"),
        sa.CheckConstraint("origem IN ('validacao', 'regressao')", name="ck_correcoes_origem"),
        sa.CheckConstraint(
            "resultado IS NULL OR resultado IN ('corrigida', 'falhou_de_novo', 'encerrada')",
            name="ck_correcoes_resultado",
        ),
    )
    op.create_index(
        "ix_correcoes_unidade_caso_ativo", "correcoes", ["unidade_id", "caso_teste_id", "ativo"]
    )
    op.create_index(
        "ix_correcoes_unidade_corretor_fechada",
        "correcoes",
        ["unidade_id", "corretor_id", "fechada_em"],
    )
    op.create_index(
        "uq_correcoes_caso_tentativa_ativa",
        "correcoes",
        ["caso_teste_id", "tentativa"],
        unique=True,
        postgresql_where=sa.text("ativo"),
    )
    op.add_column(
        "importacoes_sdf_status", sa.Column("status_anterior", sa.String(20), nullable=True)
    )
    op.execute(RETROATIVO)


def downgrade() -> None:
    op.drop_column("importacoes_sdf_status", "status_anterior")
    op.drop_index("uq_correcoes_caso_tentativa_ativa", table_name="correcoes")
    op.drop_index("ix_correcoes_unidade_corretor_fechada", table_name="correcoes")
    op.drop_index("ix_correcoes_unidade_caso_ativo", table_name="correcoes")
    op.drop_table("correcoes")
