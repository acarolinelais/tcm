"""Status In Fixes para Test Cases com FAIL na execução Form Factor mais recente"""

from collections.abc import Sequence

from alembic import op

revision: str = "f901a2b3c4d5"
down_revision: str | Sequence[str] | None = "e8f901a2b3c4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

STATUS = (
    "status IN ('To-Do', 'InProgress', 'InReview', 'InValidation', 'Done', 'InFixes', 'Cancelled')"
)
STATUS_ANTERIOR = (
    "status IN ('To-Do', 'InProgress', 'InReview', 'InValidation', 'Done', 'Cancelled')"
)


def upgrade() -> None:
    op.drop_constraint("ck_casos_teste_status", "casos_teste", type_="check")
    op.create_check_constraint(
        "ck_casos_teste_status",
        "casos_teste",
        STATUS,
    )
    # A importação SDF guarda o resultado como texto livre ("Fail"); a rodada, como "FAIL".
    op.execute(
        "UPDATE casos_teste caso SET status = 'InFixes' "
        "WHERE caso.status = 'InReview' AND EXISTS ("
        "  SELECT 1 FROM resultados_form_factor resultado "
        "  WHERE resultado.ativo AND UPPER(TRIM(resultado.resultado)) = 'FAIL' "
        "  AND resultado.execucao_sdf_id = ("
        "    SELECT execucao.id FROM execucoes_sdf execucao "
        "    LEFT JOIN importacoes_sdf importacao ON importacao.id = execucao.importacao_sdf_id "
        "    WHERE execucao.caso_teste_id = caso.id AND execucao.ativo "
        # Importação removida não conta, como no Resumo e no histórico.
        "    AND (execucao.importacao_sdf_id IS NULL OR importacao.ativo) "
        "    ORDER BY execucao.data_reportada DESC, execucao.created_at DESC LIMIT 1"
        "  )"
        ")"
    )


def downgrade() -> None:
    op.drop_constraint("ck_casos_teste_status", "casos_teste", type_="check")
    op.execute("UPDATE casos_teste SET status = 'InReview' WHERE status = 'InFixes'")
    op.create_check_constraint(
        "ck_casos_teste_status",
        "casos_teste",
        STATUS_ANTERIOR,
    )
