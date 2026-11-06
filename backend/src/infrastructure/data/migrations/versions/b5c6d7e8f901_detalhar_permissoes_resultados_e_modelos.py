"""detalha o escopo de consulta Form Factor e gestão do catálogo"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b5c6d7e8f901"
down_revision: str | Sequence[str] | None = "a4b5c6d7e8f9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text("UPDATE permissoes SET descricao = :descricao WHERE id = :id"),
        {
            "id": "form_factor.consultar",
            "descricao": (
                "Consultar Resumo e histórico Form Factor dos projetos no escopo permitido, "
                "incluindo Resultados Gerais para Administrador, Gerente e KP"
            ),
        },
    )
    bind.execute(
        sa.text("UPDATE permissoes SET descricao = :descricao WHERE id = :id"),
        {
            "id": "modelos_dispositivo.gerenciar",
            "descricao": "Cadastrar, editar, ativar e inativar modelos no catálogo da unidade",
        },
    )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text("UPDATE permissoes SET descricao = :descricao WHERE id = :id"),
        {"id": "form_factor.consultar", "descricao": "Consultar resultados Form Factor"},
    )
    bind.execute(
        sa.text("UPDATE permissoes SET descricao = :descricao WHERE id = :id"),
        {
            "id": "modelos_dispositivo.gerenciar",
            "descricao": "Cadastrar e gerenciar o catálogo de modelos de dispositivo",
        },
    )
