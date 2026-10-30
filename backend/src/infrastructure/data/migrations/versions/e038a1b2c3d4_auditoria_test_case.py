"""auditoria de alterações por triggers em casos_teste e links_pull_request (ADR 0044)"""

from collections.abc import Sequence

from alembic import op

revision: str = "e038a1b2c3d4"
down_revision: str | Sequence[str] | None = "e036a1b2c3d4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TABELAS_AUDITADAS = ("casos_teste", "links_pull_request")


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE auditoria_alteracoes (
            id              BIGSERIAL PRIMARY KEY,
            unidade_id      UUID NOT NULL,
            table_name      TEXT NOT NULL,
            operation       TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
            row_id          UUID NOT NULL,
            old_values      JSONB,
            new_values      JSONB,
            changed_fields  TEXT[],
            usuario_id      UUID,
            origem          TEXT NOT NULL,
            transaction_id  BIGINT NOT NULL DEFAULT pg_current_xact_id()::TEXT::BIGINT,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
        )
        """
    )
    op.execute(
        "CREATE INDEX ix_auditoria_alteracoes_registro "
        "ON auditoria_alteracoes (table_name, row_id, created_at)"
    )
    op.execute(
        "CREATE INDEX ix_auditoria_alteracoes_unidade "
        "ON auditoria_alteracoes (unidade_id, created_at)"
    )

    # Grava a linha antes e depois da mudança. Quem e de onde vêm do set_config da transação
    # (ADR 0044).
    # As colunas passadas como argumento do trigger (ex.: updated_at) não contam como mudança.
    # O search_path fica fixo no da criação: o INSERT acha a tabela mesmo se quem escreve usar
    # outro.
    op.execute(
        """
        CREATE FUNCTION auditoria_registrar() RETURNS trigger LANGUAGE plpgsql
        SET search_path FROM CURRENT AS $$
        DECLARE
            antigo JSONB;
            novo   JSONB;
            mudou  TEXT[];
            linha  JSONB;
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

            linha := COALESCE(novo, antigo);
            INSERT INTO auditoria_alteracoes (
                unidade_id, table_name, operation, row_id,
                old_values, new_values, changed_fields, usuario_id, origem
            ) VALUES (
                (linha ->> 'unidade_id')::UUID, TG_TABLE_NAME, TG_OP, (linha ->> 'id')::UUID,
                antigo, novo, mudou,
                NULLIF(current_setting('app.usuario_id', true), '')::UUID,
                COALESCE(NULLIF(current_setting('app.origem', true), ''), 'api')
            );
            RETURN NULL;
        END;
        $$
        """
    )

    # O histórico é imutável (spec 038, RN-05): nenhum perfil o altera ou apaga, nem direto no
    # banco.
    op.execute(
        """
        CREATE FUNCTION auditoria_bloquear_alteracao() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
            RAISE EXCEPTION 'O histórico de auditoria não pode ser alterado nem apagado.';
        END;
        $$
        """
    )
    op.execute(
        "CREATE TRIGGER auditoria_imutavel BEFORE UPDATE OR DELETE ON auditoria_alteracoes "
        "FOR EACH ROW EXECUTE FUNCTION auditoria_bloquear_alteracao()"
    )
    op.execute(
        "CREATE TRIGGER auditoria_sem_truncate BEFORE TRUNCATE ON auditoria_alteracoes "
        "FOR EACH STATEMENT EXECUTE FUNCTION auditoria_bloquear_alteracao()"
    )

    # Liga a auditoria numa tabela: SELECT auditoria_ativar('tabela') numa migration (ADR 0044).
    op.execute(
        """
        CREATE FUNCTION auditoria_ativar(
            tabela REGCLASS, ignoradas TEXT[] DEFAULT ARRAY['updated_at']
        )
        RETURNS VOID LANGUAGE plpgsql AS $$
        DECLARE
            nome TEXT := 'auditoria_' || (SELECT relname FROM pg_class WHERE oid = tabela);
        BEGIN
            EXECUTE format('DROP TRIGGER IF EXISTS %I ON %s', nome, tabela);
            EXECUTE format(
                'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON %s '
                'FOR EACH ROW EXECUTE FUNCTION auditoria_registrar(%s)',
                nome, tabela,
                (SELECT string_agg(quote_literal(coluna), ', ') FROM unnest(ignoradas) AS coluna)
            );
        END;
        $$
        """
    )
    for tabela in TABELAS_AUDITADAS:
        op.execute(f"SELECT auditoria_ativar('{tabela}')")


def downgrade() -> None:
    for tabela in TABELAS_AUDITADAS:
        op.execute(f"DROP TRIGGER IF EXISTS auditoria_{tabela} ON {tabela}")
    op.execute("DROP FUNCTION auditoria_ativar(REGCLASS, TEXT[])")
    op.execute("DROP TABLE auditoria_alteracoes")
    op.execute("DROP FUNCTION auditoria_bloquear_alteracao()")
    op.execute("DROP FUNCTION auditoria_registrar()")
