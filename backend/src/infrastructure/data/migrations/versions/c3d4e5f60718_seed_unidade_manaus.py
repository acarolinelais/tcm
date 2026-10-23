"""seed unidade Manaus e admin bootstrap

Revision ID: c3d4e5f60718
Revises: b2c3d4e5f607
Create Date: 2026-10-22 00:00:00.000000
"""

import os
from collections.abc import Sequence
from uuid import uuid4

import sqlalchemy as sa
from alembic import op
from argon2 import PasswordHasher

revision: str = "c3d4e5f60718"
down_revision: str | Sequence[str] | None = "b2c3d4e5f607"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

ADMIN_EMAIL = "admin@sdfmanager.com"
ADMIN_NOME = "Administradora da Unidade Manaus"


def upgrade() -> None:
    senha = os.environ.get("BOOTSTRAP_ADMIN_SENHA")
    if not senha:
        raise RuntimeError("Defina BOOTSTRAP_ADMIN_SENHA antes de aplicar as migrations.")
    bind = op.get_bind()
    unidade_id = bind.execute(
        sa.text("SELECT id FROM unidades WHERE nome = :nome ORDER BY id LIMIT 1"),
        {"nome": "Manaus"},
    ).scalar_one_or_none()
    if unidade_id is None:
        unidade_id = uuid4()
        bind.execute(
            sa.text("INSERT INTO unidades (id, nome, ativo) VALUES (:id, :nome, true)"),
            {"id": unidade_id, "nome": "Manaus"},
        )
    usuario_id = bind.execute(
        sa.text("SELECT id FROM usuarios WHERE email = :email"), {"email": ADMIN_EMAIL}
    ).scalar_one_or_none()
    if usuario_id is not None:
        raise RuntimeError(
            f"O e-mail reservado para o admin bootstrap já pertence a uma conta: {ADMIN_EMAIL}."
        )
    values = {
        "unidade_id": unidade_id,
        "nome": ADMIN_NOME,
        "email": ADMIN_EMAIL,
        "senha_hash": PasswordHasher().hash(senha),
    }
    bind.execute(
        sa.text(
            "INSERT INTO usuarios "
            "(id, unidade_id, nome, email, ativo, senha_hash, admin_unidade) "
            "VALUES (:id, :unidade_id, :nome, :email, true, :senha_hash, true)"
        ),
        {"id": uuid4(), **values},
    )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text("DELETE FROM usuarios WHERE email IN (:email, :previous_email)"),
        {"email": ADMIN_EMAIL, "previous_email": "admin@sdf.local"},
    )
