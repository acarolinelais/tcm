"""auditoria guarda nome e perfil do usuário e a tela de origem (spec 038, ADR 0044)"""

from collections.abc import Sequence

from alembic import op

revision: str = "e038b1c2d3e4"
down_revision: str | Sequence[str] | None = "e038a1b2c3d4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# O corpo da função muda só no bloco do usuário e no INSERT; o resto é igual ao da e038a1b2c3d4.
_FUNCAO = """
CREATE OR REPLACE FUNCTION auditoria_registrar() RETURNS trigger LANGUAGE plpgsql
SET search_path FROM CURRENT AS $$
DECLARE
    antigo  JSONB;
    novo    JSONB;
    mudou   TEXT[];
    linha   JSONB;
    usuario UUID := NULLIF(current_setting('app.usuario_id', true), '')::UUID;
    nome    TEXT;
    perfil  TEXT;
BEGIN
    IF TG_OP <> 'INSERT' THEN antigo := to_jsonb(OLD); END IF;
    IF TG_OP <> 'DELETE' THEN novo := to_jsonb(NEW); END IF;

    IF TG_OP = 'UPDATE' THEN
        SELECT array_agg(n.key ORDER BY n.key) INTO mudou
        FROM jsonb_each(novo) n
        JOIN jsonb_each(antigo) o USING (key)
        WHERE n.value IS DISTINCT FROM o.value
          AND NOT (n.key = ANY (COALESCE(TG_ARGV, '{}'::TEXT[])));
        IF mudou IS NULL THEN
            RETURN NULL;
        END IF;
    END IF;
    __BLOCO_USUARIO__
    linha := COALESCE(novo, antigo);
    INSERT INTO auditoria_alteracoes (
        unidade_id, table_name, operation, row_id,
        old_values, new_values, changed_fields, usuario_id, origem__COLUNAS__
    ) VALUES (
        (linha ->> 'unidade_id')::UUID, TG_TABLE_NAME, TG_OP, (linha ->> 'id')::UUID,
        antigo, novo, mudou, usuario,
        COALESCE(NULLIF(current_setting('app.origem', true), ''), 'api')__VALORES__
    );
    RETURN NULL;
END;
$$
"""

# Nome e perfil do momento da mudança: renomear a pessoa ou trocar o perfil depois não
# reescreve o passado.
_BLOCO_USUARIO = """
    IF usuario IS NOT NULL THEN
        SELECT u.nome, p.nome INTO nome, perfil
        FROM usuarios u LEFT JOIN perfis p ON p.id = u.perfil_id
        WHERE u.id = usuario;
    END IF;
"""


def _funcao(bloco_usuario: str, colunas: str, valores: str) -> str:
    # replace, e não format: o SQL tem chaves literais ('{}'::TEXT[]).
    return (
        _FUNCAO.replace("__BLOCO_USUARIO__", bloco_usuario)
        .replace("__COLUNAS__", colunas)
        .replace("__VALORES__", valores)
    )


def upgrade() -> None:
    op.execute(
        "ALTER TABLE auditoria_alteracoes "
        "ADD COLUMN usuario_nome TEXT, ADD COLUMN perfil_nome TEXT, ADD COLUMN tela TEXT"
    )
    op.execute(
        _funcao(
            _BLOCO_USUARIO,
            ", usuario_nome, perfil_nome, tela",
            ", nome, perfil, NULLIF(current_setting('app.tela', true), '')",
        )
    )


def downgrade() -> None:
    op.execute(_funcao("", "", ""))
    op.execute(
        "ALTER TABLE auditoria_alteracoes "
        "DROP COLUMN usuario_nome, DROP COLUMN perfil_nome, DROP COLUMN tela"
    )
