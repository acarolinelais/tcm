"""semeia usuários e a estrutura organizacional inicial de SVP"""

import os
from collections.abc import Sequence
from uuid import uuid4

import sqlalchemy as sa
from alembic import op
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

revision: str = "f1a2b3c4d5e6"
down_revision: str | Sequence[str] | None = "0ef76e2d9713"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

USUARIOS = (
    ("Ivan Moreira", "ivan.moreira", "GERENTE", "ivan.moreira@sidia.com"),
    ("Afonso Fagundes", "afonso.fagundes", "KP", "afonso.fagundes@sidia.com"),
    ("Maria Pernalete", "maria.pernalete", "KP", "maria.pernalete@sidia.com"),
    ("Caroline Laís", "caroline.silva", "USUARIO_PADRAO", "caroline.silva@sidia.com"),
    ("Raquel Batista", "raquel.batista", "USUARIO_PADRAO", "raquel.batista@sidia.com"),
    ("Isabel Gama", "isabel.gama", "USUARIO_PADRAO", "isabel.gama@sidia.com"),
    ("Nivea Pereira", "nivea.pereira", "USUARIO_PADRAO", "nivea.pereira@sidia.com"),
    ("Victoria Andrade", "victoria.santos", "USUARIO_PADRAO", "victoria.santos@sidia.com"),
    ("Janderson Brandão", "janderson.brandao", "USUARIO_PADRAO", "janderson.brandao@sidia.com"),
    ("Gilmar Silva", "gilmar.silva", "USUARIO_PADRAO", "gilmar.silva@sidia.com"),
    ("Marcio Marques", "marcio.marques", "USUARIO_PADRAO", "marcio.marques@sidia.com"),
    (
        "Guilherme Rabaioli",
        "guilherme.vieira",
        "USUARIO_PADRAO",
        "guilherme.vieira@sidia.com",
    ),
)


def upgrade() -> None:
    bind = op.get_bind()
    senha_inicial = os.environ.get("SENHA_INICIAL_USUARIOS")
    if not senha_inicial:
        raise RuntimeError("Defina SENHA_INICIAL_USUARIOS antes de aplicar a seed SVP.")

    unidade_ids = (
        bind.execute(sa.text("SELECT id FROM unidades WHERE lower(nome) = 'manaus' ORDER BY id"))
        .scalars()
        .all()
    )
    if len(unidade_ids) != 1:
        raise RuntimeError(
            f"A seed SVP exige exatamente uma unidade Manaus; foram encontradas {len(unidade_ids)}."
        )
    unidade_id = unidade_ids[0]

    perfis = {}
    for codigo in {usuario[2] for usuario in USUARIOS}:
        perfil_ids = (
            bind.execute(
                sa.text(
                    "SELECT id FROM perfis "
                    "WHERE unidade_id = :unidade_id AND codigo = :codigo ORDER BY id"
                ),
                {"unidade_id": unidade_id, "codigo": codigo},
            )
            .scalars()
            .all()
        )
        if len(perfil_ids) != 1:
            raise RuntimeError(
                f"A unidade Manaus precisa ter exatamente um perfil {codigo}; "
                f"foram encontrados {len(perfil_ids)}."
            )
        perfis[codigo] = perfil_ids[0]

    setor_id = _localizar_unico(
        bind,
        "SELECT id FROM setores WHERE unidade_id = :unidade_id AND lower(nome) = 'svp' ORDER BY id",
        {"unidade_id": unidade_id},
        "setor SVP",
    )
    time_id = _localizar_unico(
        bind,
        "SELECT id FROM times WHERE unidade_id = :unidade_id "
        "AND lower(nome) = 'sdf automation' ORDER BY id",
        {"unidade_id": unidade_id},
        "time SDF Automation",
    )

    ids_usuarios = _prevalidar_usuarios(bind, unidade_id)

    hasher = PasswordHasher()
    usuarios_por_user_id = {}
    for nome, user_id, perfil_codigo, email in USUARIOS:
        usuario_id = ids_usuarios[user_id]
        perfil_id = perfis[perfil_codigo]
        if usuario_id is None:
            usuario_id = uuid4()
            bind.execute(
                sa.text(
                    "INSERT INTO usuarios "
                    "(id, unidade_id, nome, email, user_id, perfil_id, senha_hash, "
                    "senha_alteracao_obrigatoria, ativo) "
                    "VALUES (:id, :unidade_id, :nome, :email, :user_id, :perfil_id, "
                    ":senha_hash, true, true)"
                ),
                {
                    "id": usuario_id,
                    "unidade_id": unidade_id,
                    "nome": nome,
                    "email": email,
                    "user_id": user_id,
                    "perfil_id": perfil_id,
                    "senha_hash": hasher.hash(senha_inicial),
                },
            )
        else:
            atual = (
                bind.execute(
                    sa.text(
                        "SELECT nome, email, user_id, perfil_id, senha_hash, "
                        "senha_alteracao_obrigatoria, ativo "
                        "FROM usuarios WHERE id = :id"
                    ),
                    {"id": usuario_id},
                )
                .mappings()
                .one()
            )
            senha_correta = _senha_inicial_valida(
                hasher, atual["senha_hash"], atual["senha_alteracao_obrigatoria"], senha_inicial
            )
            alterado = (
                atual["nome"] != nome
                or atual["email"].casefold() != email.casefold()
                or (atual["user_id"] or "").casefold() != user_id.casefold()
                or atual["perfil_id"] != perfil_id
                or not senha_correta
                or not atual["ativo"]
            )
            if alterado:
                senha_hash = atual["senha_hash"] if senha_correta else hasher.hash(senha_inicial)
                bind.execute(
                    sa.text(
                        "UPDATE usuarios SET nome = :nome, email = :email, user_id = :user_id, "
                        "perfil_id = :perfil_id, senha_hash = :senha_hash, "
                        "senha_alteracao_obrigatoria = true, ativo = true, "
                        "auth_version = auth_version + 1 WHERE id = :id"
                    ),
                    {
                        "id": usuario_id,
                        "nome": nome,
                        "email": email,
                        "user_id": user_id,
                        "perfil_id": perfil_id,
                        "senha_hash": senha_hash,
                    },
                )
        usuarios_por_user_id[user_id] = usuario_id

    gerente_id = usuarios_por_user_id["ivan.moreira"]
    if setor_id is None:
        setor_id = uuid4()
        bind.execute(
            sa.text(
                "INSERT INTO setores (id, unidade_id, nome, ativo) "
                "VALUES (:id, :unidade_id, 'SVP', true)"
            ),
            {"id": setor_id, "unidade_id": unidade_id},
        )
    else:
        bind.execute(sa.text("UPDATE setores SET ativo = true WHERE id = :id"), {"id": setor_id})

    gerente_setor = bind.execute(
        sa.text(
            "SELECT id FROM setor_gerentes "
            "WHERE unidade_id = :unidade_id AND setor_id = :setor_id AND usuario_id = :usuario_id"
        ),
        {"unidade_id": unidade_id, "setor_id": setor_id, "usuario_id": gerente_id},
    ).scalar_one_or_none()
    if gerente_setor is None:
        bind.execute(
            sa.text(
                "INSERT INTO setor_gerentes (id, unidade_id, setor_id, usuario_id, ativo) "
                "VALUES (:id, :unidade_id, :setor_id, :usuario_id, true)"
            ),
            {
                "id": uuid4(),
                "unidade_id": unidade_id,
                "setor_id": setor_id,
                "usuario_id": gerente_id,
            },
        )
    else:
        bind.execute(
            sa.text("UPDATE setor_gerentes SET ativo = true WHERE id = :id"),
            {"id": gerente_setor},
        )

    if time_id is None:
        time_id = uuid4()
        bind.execute(
            sa.text(
                "INSERT INTO times (id, unidade_id, setor_id, nome, ativo) "
                "VALUES (:id, :unidade_id, :setor_id, 'SDF Automation', true)"
            ),
            {"id": time_id, "unidade_id": unidade_id, "setor_id": setor_id},
        )
    else:
        bind.execute(
            sa.text("UPDATE times SET setor_id = :setor_id, ativo = true WHERE id = :id"),
            {"id": time_id, "setor_id": setor_id},
        )

    for _, user_id, perfil_codigo, _ in USUARIOS:
        if perfil_codigo == "GERENTE":
            continue
        usuario_id = usuarios_por_user_id[user_id]
        membro_id = bind.execute(
            sa.text(
                "SELECT id FROM time_membros WHERE time_id = :time_id AND usuario_id = :usuario_id"
            ),
            {"time_id": time_id, "usuario_id": usuario_id},
        ).scalar_one_or_none()
        if membro_id is None:
            bind.execute(
                sa.text(
                    "INSERT INTO time_membros (id, unidade_id, time_id, usuario_id, ativo) "
                    "VALUES (:id, :unidade_id, :time_id, :usuario_id, true)"
                ),
                {
                    "id": uuid4(),
                    "unidade_id": unidade_id,
                    "time_id": time_id,
                    "usuario_id": usuario_id,
                },
            )
        else:
            bind.execute(
                sa.text("UPDATE time_membros SET ativo = true WHERE id = :id"),
                {"id": membro_id},
            )


def _localizar_unico(bind, sql: str, parametros: dict, entidade: str):
    encontrados = bind.execute(sa.text(sql), parametros).scalars().all()
    if len(encontrados) > 1:
        raise RuntimeError(
            f"A seed SVP encontrou {len(encontrados)} registros para {entidade}; "
            "resolva a duplicidade antes de continuar."
        )
    return encontrados[0] if encontrados else None


def _prevalidar_usuarios(bind, unidade_id) -> dict[str, object | None]:
    encontrados_por_user_id = {}
    ids_reutilizados = set()
    for nome, user_id, _, email in USUARIOS:
        por_user_id = bind.execute(
            sa.text(
                "SELECT id FROM usuarios WHERE unidade_id = :unidade_id "
                "AND lower(user_id) = lower(:user_id)"
            ),
            {"unidade_id": unidade_id, "user_id": user_id},
        ).scalar_one_or_none()
        por_email = (
            bind.execute(
                sa.text("SELECT id, unidade_id FROM usuarios WHERE lower(email) = lower(:email)"),
                {"email": email},
            )
            .mappings()
            .one_or_none()
        )
        if por_email is not None and por_email["unidade_id"] != unidade_id:
            raise RuntimeError(
                f"O e-mail {email} já pertence a um usuário de outra unidade; "
                "a seed SVP foi cancelada."
            )
        por_email_id = por_email["id"] if por_email is not None else None
        if por_user_id is not None and por_email_id is not None and por_user_id != por_email_id:
            raise RuntimeError(
                f"O user_id {user_id} e o e-mail {email} pertencem a contas diferentes; "
                "a seed SVP foi cancelada sem alteração."
            )
        usuario_id = por_user_id or por_email_id
        if usuario_id is not None and usuario_id in ids_reutilizados:
            raise RuntimeError(
                f"Mais de uma entrada da seed SVP aponta para a mesma conta ({nome}); "
                "a seed foi cancelada."
            )
        if usuario_id is not None:
            ids_reutilizados.add(usuario_id)
        encontrados_por_user_id[user_id] = usuario_id
    return encontrados_por_user_id


def _senha_inicial_valida(
    hasher: PasswordHasher, senha_hash: str | None, troca_obrigatoria: bool, senha: str
) -> bool:
    if not senha_hash or not troca_obrigatoria:
        return False
    try:
        return hasher.verify(senha_hash, senha)
    except (InvalidHashError, VerificationError):
        return False


def downgrade() -> None:
    raise RuntimeError(
        "A seed SVP reconcilia contas e vínculos preexistentes; "
        "não é seguro revertê-la automaticamente."
    )
