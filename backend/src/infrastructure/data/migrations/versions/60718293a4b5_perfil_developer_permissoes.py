"""renomeia o perfil padrão e limita permissões ao trabalho do developer"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "60718293a4b5"
down_revision: str | Sequence[str] | None = "5f60718293a4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

PERMISSOES_DEVELOPER = ("projetos.consultar", "test_cases.consultar")
PERMISSOES_ANTERIORES = (
    "usuarios.consultar",
    "setores.consultar",
    "times.consultar",
    "projetos.consultar",
    "test_cases.consultar",
    "form_factor.consultar",
)


def upgrade() -> None:
    bind = op.get_bind()
    perfil_ids = bind.execute(
        sa.text("SELECT id FROM perfis WHERE codigo = 'USUARIO_PADRAO'")
    ).scalars().all()
    if not perfil_ids:
        return

    # Evita conflito caso uma unidade já tenha criado um perfil próprio com esse nome.
    bind.execute(
        sa.text(
            "UPDATE perfis AS padrao SET nome = 'Developer', "
            "descricao = 'Consulta projetos e Test Cases do time e atualiza apenas os TCs atribuídos.' "
            "WHERE padrao.codigo = 'USUARIO_PADRAO' AND NOT EXISTS ("
            "SELECT 1 FROM perfis outro WHERE outro.unidade_id = padrao.unidade_id "
            "AND outro.id <> padrao.id AND lower(outro.nome) = lower('Developer'))"
        )
    )
    bind.execute(
        sa.text(
            "DELETE FROM perfil_permissoes WHERE perfil_id IN :ids "
            "AND permissao_id NOT IN :permissoes"
        ).bindparams(sa.bindparam("ids", expanding=True), sa.bindparam("permissoes", expanding=True)),
        {"ids": perfil_ids, "permissoes": PERMISSOES_DEVELOPER},
    )
    bind.execute(
        sa.text(
            "INSERT INTO perfil_permissoes (perfil_id, permissao_id) "
            "SELECT perfil.id, permissao.id FROM perfis perfil "
            "CROSS JOIN permissoes permissao "
            "WHERE perfil.codigo = 'USUARIO_PADRAO' AND permissao.id IN :permissoes "
            "AND NOT EXISTS (SELECT 1 FROM perfil_permissoes pp "
            "WHERE pp.perfil_id = perfil.id AND pp.permissao_id = permissao.id)"
        ).bindparams(sa.bindparam("permissoes", expanding=True)),
        {"permissoes": PERMISSOES_DEVELOPER},
    )
    bind.execute(
        sa.text(
            "UPDATE usuarios SET auth_version = auth_version + 1 "
            "WHERE perfil_id IN :ids"
        ).bindparams(sa.bindparam("ids", expanding=True)),
        {"ids": perfil_ids},
    )


def downgrade() -> None:
    bind = op.get_bind()
    perfil_ids = bind.execute(
        sa.text("SELECT id FROM perfis WHERE codigo = 'USUARIO_PADRAO'")
    ).scalars().all()
    if not perfil_ids:
        return
    bind.execute(
        sa.text(
            "UPDATE perfis SET nome = 'Usuário padrão', descricao = 'Perfil padrão da unidade.' "
            "WHERE codigo = 'USUARIO_PADRAO' AND nome = 'Developer'"
        )
    )
    bind.execute(
        sa.text(
            "INSERT INTO perfil_permissoes (perfil_id, permissao_id) "
            "SELECT perfil.id, permissao.id FROM perfis perfil "
            "CROSS JOIN permissoes permissao "
            "WHERE perfil.codigo = 'USUARIO_PADRAO' AND permissao.id IN :permissoes "
            "AND NOT EXISTS (SELECT 1 FROM perfil_permissoes pp "
            "WHERE pp.perfil_id = perfil.id AND pp.permissao_id = permissao.id)"
        ).bindparams(sa.bindparam("permissoes", expanding=True)),
        {"permissoes": PERMISSOES_ANTERIORES},
    )
    bind.execute(
        sa.text(
            "UPDATE usuarios SET auth_version = auth_version + 1 "
            "WHERE perfil_id IN :ids"
        ).bindparams(sa.bindparam("ids", expanding=True)),
        {"ids": perfil_ids},
    )
