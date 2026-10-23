"""adiciona permissões de projetos, Test Cases e Form Factor"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "2c3d4e5f6071"
down_revision: str | Sequence[str] | None = "1b2c3d4e5f60"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

PERMISSOES = (
    ("projetos.consultar", "Consultar projetos"),
    ("projetos.gerenciar", "Criar e gerenciar projetos"),
    ("test_cases.consultar", "Consultar Test Cases do time"),
    ("test_cases.gerenciar", "Gerenciar Test Cases do time"),
    ("form_factor.consultar", "Consultar resultados Form Factor"),
    ("form_factor.importar", "Importar resultados exportados pelo SDF"),
)
PERMISSOES_CONSULTA_PADRAO = (
    "projetos.consultar",
    "test_cases.consultar",
    "form_factor.consultar",
)


def upgrade() -> None:
    bind = op.get_bind()
    for codigo, descricao in PERMISSOES:
        bind.execute(
            sa.text(
                "INSERT INTO permissoes (id, descricao) VALUES (:id, :descricao) "
                "ON CONFLICT (id) DO NOTHING"
            ),
            {"id": codigo, "descricao": descricao},
        )

    permissoes_gestao = [codigo for codigo, _ in PERMISSOES]
    perfis_gestao = (
        bind.execute(
            sa.text(
                "INSERT INTO perfil_permissoes (perfil_id, permissao_id) "
                "SELECT perfis.id, permissoes.id FROM perfis "
                "CROSS JOIN permissoes "
                "WHERE perfis.codigo IN ('ADMIN_UNIDADE', 'GERENTE', 'KP') "
                "AND permissoes.id IN :permissoes "
                "AND NOT EXISTS (SELECT 1 FROM perfil_permissoes pp "
                "WHERE pp.perfil_id = perfis.id AND pp.permissao_id = permissoes.id) "
                "RETURNING perfil_id"
            ).bindparams(sa.bindparam("permissoes", expanding=True)),
            {"permissoes": permissoes_gestao},
        )
        .scalars()
        .all()
    )
    perfis_consulta = (
        bind.execute(
            sa.text(
                "INSERT INTO perfil_permissoes (perfil_id, permissao_id) "
                "SELECT perfis.id, permissoes.id FROM perfis "
                "CROSS JOIN permissoes "
                "WHERE perfis.codigo = 'USUARIO_PADRAO' "
                "AND permissoes.id IN :permissoes "
                "AND NOT EXISTS (SELECT 1 FROM perfil_permissoes pp "
                "WHERE pp.perfil_id = perfis.id AND pp.permissao_id = permissoes.id) "
                "RETURNING perfil_id"
            ).bindparams(sa.bindparam("permissoes", expanding=True)),
            {"permissoes": list(PERMISSOES_CONSULTA_PADRAO)},
        )
        .scalars()
        .all()
    )
    perfis_atualizados = tuple(set(perfis_gestao + perfis_consulta))
    if perfis_atualizados:
        bind.execute(
            sa.text(
                "UPDATE usuarios SET auth_version = auth_version + 1 WHERE perfil_id IN :ids"
            ).bindparams(sa.bindparam("ids", expanding=True)),
            {"ids": perfis_atualizados},
        )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text("DELETE FROM perfil_permissoes WHERE permissao_id IN :permissoes").bindparams(
            sa.bindparam("permissoes", expanding=True)
        ),
        {"permissoes": [codigo for codigo, _ in PERMISSOES]},
    )
    bind.execute(
        sa.text("DELETE FROM permissoes WHERE id IN :permissoes").bindparams(
            sa.bindparam("permissoes", expanding=True)
        ),
        {"permissoes": [codigo for codigo, _ in PERMISSOES]},
    )
