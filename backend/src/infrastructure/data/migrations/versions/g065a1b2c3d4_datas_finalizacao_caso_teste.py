"""datas de finalização do Test Case: Code done e All passed (spec 065)"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "g065a1b2c3d4"
down_revision: str | Sequence[str] | None = "f060a1b2c3d4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Primeira entrada em In Review registrada na auditoria (RN-09). A auditoria grava com fuso; as
# colunas do caso ficam em UTC sem fuso, como `data_reportada`.
RETROATIVO_CODE_DONE = """
UPDATE casos_teste caso SET code_done_em = primeira.data
FROM (
    SELECT row_id, MIN(created_at) AT TIME ZONE 'UTC' AS data
    FROM auditoria_alteracoes
    WHERE table_name = 'casos_teste'
      AND new_values ->> 'status' = 'InReview'
      AND (operation = 'INSERT' OR old_values ->> 'status' IS DISTINCT FROM 'InReview')
    GROUP BY row_id
) primeira
WHERE caso.id = primeira.row_id
"""

# A mesma regra de `CasoTesteRepositoryImpl.marcar_todos_aprovados`, em SQL: a migration não importa
# código da aplicação. Último resultado de cada device ativo do projeto, em execução válida, com o
# desempate da General Results; o caso fecha quando todos os devices têm resultado e todos são PASS.
RETROATIVO_ALL_PASSED = """
WITH ultimos AS (
    SELECT DISTINCT ON (execucao.caso_teste_id, resultado.modelo_dispositivo_id)
        execucao.caso_teste_id, caso.projeto_id, resultado.resultado, execucao.data_reportada
    FROM resultados_form_factor resultado
    JOIN execucoes_sdf execucao ON execucao.id = resultado.execucao_sdf_id
    JOIN casos_teste caso ON caso.id = execucao.caso_teste_id
    JOIN projeto_modelos vinculo
      ON vinculo.projeto_id = caso.projeto_id
     AND vinculo.modelo_dispositivo_id = resultado.modelo_dispositivo_id
     AND vinculo.unidade_id = resultado.unidade_id
     AND vinculo.ativo
    LEFT JOIN importacoes_sdf importacao ON importacao.id = execucao.importacao_sdf_id
    WHERE resultado.ativo AND execucao.ativo AND execucao.unidade_id = resultado.unidade_id
      AND (
        (execucao.origem = 'SDF' AND importacao.projeto_id = caso.projeto_id AND importacao.ativo)
        OR (execucao.origem = 'MANUAL' AND execucao.importacao_sdf_id IS NULL)
      )
    ORDER BY execucao.caso_teste_id, resultado.modelo_dispositivo_id,
             execucao.data_reportada DESC,
             COALESCE(importacao.created_at, execucao.created_at) DESC,
             execucao.id DESC
)
UPDATE casos_teste caso SET all_passed_em = aprovado.data
FROM (
    SELECT ultimos.caso_teste_id, MAX(ultimos.data_reportada) AS data
    FROM ultimos
    GROUP BY ultimos.caso_teste_id, ultimos.projeto_id
    HAVING BOOL_AND(UPPER(TRIM(ultimos.resultado)) = 'PASS')
       AND COUNT(*) = (
            SELECT COUNT(*) FROM projeto_modelos vinculo
            WHERE vinculo.projeto_id = ultimos.projeto_id AND vinculo.ativo
       )
) aprovado
WHERE caso.id = aprovado.caso_teste_id
"""


def upgrade() -> None:
    op.add_column("casos_teste", sa.Column("code_done_em", sa.DateTime(), nullable=True))
    op.add_column("casos_teste", sa.Column("all_passed_em", sa.DateTime(), nullable=True))
    # As datas são calculadas: não entram no histórico. Religar antes do retroativo também evita
    # uma linha de auditoria por caso preenchido.
    op.execute(
        "SELECT auditoria_ativar('casos_teste', "
        "ARRAY['updated_at', 'code_done_em', 'all_passed_em'])"
    )
    op.execute(RETROATIVO_CODE_DONE)
    op.execute(RETROATIVO_ALL_PASSED)


def downgrade() -> None:
    op.execute("SELECT auditoria_ativar('casos_teste')")
    op.drop_column("casos_teste", "all_passed_em")
    op.drop_column("casos_teste", "code_done_em")
