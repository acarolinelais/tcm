import importlib
import os
from pathlib import Path
from uuid import uuid4

import pytest
import sqlalchemy as sa
from alembic import command
from alembic.config import Config
from alembic.operations import Operations
from alembic.runtime.migration import MigrationContext
from argon2 import PasswordHasher
from dotenv import load_dotenv
from sqlalchemy import select, text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from src.infrastructure.data.models.perfil_model import PerfilModel
from src.infrastructure.data.models.permissao_model import PerfilPermissaoModel
from src.infrastructure.data.models.setor_gerente_model import SetorGerenteModel
from src.infrastructure.data.models.setor_model import SetorModel
from src.infrastructure.data.models.time_membro_model import TimeMembroModel
from src.infrastructure.data.models.time_model import TimeModel
from src.infrastructure.data.models.unidade_model import UnidadeModel
from src.infrastructure.data.models.usuario_model import UsuarioModel

load_dotenv()

pytestmark = pytest.mark.skipif(
    not os.environ.get("SDF_TEST_DATABASE_URL"),
    reason="Defina SDF_TEST_DATABASE_URL para executar a integração com Postgres.",
)

USUARIOS = {
    "ivan.moreira@sidia.com": ("Ivan Moreira", "ivan.moreira", "GERENTE"),
    "a.fagundes@sidia.com": ("Afonso Fagundes", "a.fagundes", "KP"),
    "maria.pernalete@sidia.com": ("Maria Pernalete", "maria.pernalete", "KP"),
    "caroline.silva@sidia.com": ("Caroline Laís", "caroline.silva", "USUARIO_PADRAO"),
    "raquel.batista@sidia.com": ("Raquel Batista", "raquel.batista", "USUARIO_PADRAO"),
    "isabel.gama@sidia.com": ("Isabel Gama", "isabel.gama", "USUARIO_PADRAO"),
    "nivea.pereira@sidia.com": ("Nivea Pereira", "nivea.pereira", "USUARIO_PADRAO"),
    "victoria.andrade@sidia.com": ("Victoria Andrade", "victoria.andrade", "USUARIO_PADRAO"),
    "janderson.brandao@sidia.com": ("Janderson Brandão", "janderson.brandao", "USUARIO_PADRAO"),
    "gilmar.silva@sidia.com": ("Gilmar Silva", "gilmar.silva", "USUARIO_PADRAO"),
    "marcio.marques@sidia.com": ("Marcio Marques", "marcio.marques", "USUARIO_PADRAO"),
    "guilherme.rabaioli@sidia.com": (
        "Guilherme Rabaioli",
        "guilherme.rabaioli",
        "USUARIO_PADRAO",
    ),
}
MEMBROS = {user_id for _, user_id, codigo in USUARIOS.values() if codigo != "GERENTE"}


def _aplicar_migration(connection):
    migration = importlib.import_module(
        "src.infrastructure.data.migrations.versions.f1a2b3c4d5e6_seed_organizacional_svp"
    )
    with Operations.context(MigrationContext.configure(connection)):
        migration.upgrade()


@pytest.mark.asyncio
async def test_seed_svp_cria_usuarios_e_hierarquia_com_senha_inicial():
    assert os.environ.get("SENHA_INICIAL_USUARIOS")
    engine = create_async_engine(os.environ["SDF_TEST_DATABASE_URL"])
    try:
        async with async_sessionmaker(engine)() as session:
            unidade = await session.scalar(
                select(UnidadeModel).where(UnidadeModel.nome == "Manaus")
            )
            assert unidade is not None
            rows = (
                await session.execute(
                    select(UsuarioModel, PerfilModel)
                    .join(PerfilModel, PerfilModel.id == UsuarioModel.perfil_id)
                    .where(
                        UsuarioModel.unidade_id == unidade.id,
                        UsuarioModel.email.in_(USUARIOS),
                    )
                )
            ).all()
            assert len(rows) == len(USUARIOS)
            por_email = {usuario.email: (usuario, perfil) for usuario, perfil in rows}
            hasher = PasswordHasher()
            for email, (nome, user_id, perfil_codigo) in USUARIOS.items():
                usuario, perfil = por_email[email]
                assert (usuario.nome, usuario.user_id, perfil.codigo) == (
                    nome,
                    user_id,
                    perfil_codigo,
                )
                assert usuario.ativo is True
                assert usuario.senha_alteracao_obrigatoria is True
                assert usuario.senha_hash is not None
                assert hasher.verify(usuario.senha_hash, os.environ["SENHA_INICIAL_USUARIOS"])

            setor = await session.scalar(
                select(SetorModel).where(
                    SetorModel.unidade_id == unidade.id, SetorModel.nome.ilike("svp")
                )
            )
            assert setor is not None and setor.ativo
            time = await session.scalar(
                select(TimeModel).where(
                    TimeModel.unidade_id == unidade.id, TimeModel.nome.ilike("sdf automation")
                )
            )
            assert time is not None and time.setor_id == setor.id and time.ativo
            ivan = por_email["ivan.moreira@sidia.com"][0]
            assert (
                await session.scalar(
                    select(SetorGerenteModel.id).where(
                        SetorGerenteModel.unidade_id == unidade.id,
                        SetorGerenteModel.setor_id == setor.id,
                        SetorGerenteModel.usuario_id == ivan.id,
                        SetorGerenteModel.ativo.is_(True),
                    )
                )
                is not None
            )
            membros = set(
                (
                    await session.execute(
                        select(UsuarioModel.user_id)
                        .join(TimeMembroModel, TimeMembroModel.usuario_id == UsuarioModel.id)
                        .where(TimeMembroModel.time_id == time.id, TimeMembroModel.ativo.is_(True))
                    )
                ).scalars()
            )
            assert MEMBROS <= membros
            assert "ivan.moreira" not in membros
            assert (
                await session.scalar(
                    select(TimeMembroModel.id).where(
                        TimeMembroModel.time_id == time.id,
                        TimeMembroModel.usuario_id == ivan.id,
                        TimeMembroModel.ativo.is_(True),
                    )
                )
                is None
            )
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_seed_reconcilia_conta_e_time_sem_alterar_admin_permissoes_ou_membros_legados():
    engine = create_async_engine(os.environ["SDF_TEST_DATABASE_URL"])
    hasher = PasswordHasher()
    try:
        async with engine.connect() as connection:
            transaction = await connection.begin()
            try:
                unidade_id = await connection.scalar(
                    select(UnidadeModel.id).where(UnidadeModel.nome == "Manaus")
                )
                assert unidade_id is not None
                caroline_id = await connection.scalar(
                    select(UsuarioModel.id).where(
                        UsuarioModel.unidade_id == unidade_id,
                        UsuarioModel.user_id == "caroline.silva",
                    )
                )
                team_id = await connection.scalar(
                    select(TimeModel.id).where(
                        TimeModel.unidade_id == unidade_id,
                        TimeModel.nome.ilike("sdf automation"),
                    )
                )
                admin = (
                    await connection.execute(
                        select(
                            UsuarioModel.id,
                            UsuarioModel.nome,
                            UsuarioModel.email,
                            UsuarioModel.perfil_id,
                            UsuarioModel.auth_version,
                        ).where(UsuarioModel.email == "admin@sdfmanager.com")
                    )
                ).one()
                permissions_before = set(
                    (
                        await connection.execute(
                            select(
                                PerfilPermissaoModel.perfil_id, PerfilPermissaoModel.permissao_id
                            )
                        )
                    ).all()
                )
                assert caroline_id is not None and team_id is not None

                fota_id = await connection.scalar(
                    select(SetorModel.id).where(
                        SetorModel.unidade_id == unidade_id, SetorModel.nome.ilike("fota fus")
                    )
                )
                if fota_id is None:
                    fota_id = uuid4()
                    await connection.execute(
                        text(
                            "INSERT INTO setores (id, unidade_id, nome, ativo) "
                            "VALUES (:id, :unidade_id, 'FOTA FUS', true)"
                        ),
                        {"id": fota_id, "unidade_id": unidade_id},
                    )
                await connection.execute(
                    text(
                        "UPDATE usuarios SET nome='Carol', email='carol@email.com', "
                        "senha_hash=:senha_hash, senha_alteracao_obrigatoria=false "
                        "WHERE id=:id"
                    ),
                    {"id": caroline_id, "senha_hash": hasher.hash("senha-antiga")},
                )
                await connection.execute(
                    text("UPDATE times SET setor_id=:setor_id WHERE id=:id"),
                    {"id": team_id, "setor_id": fota_id},
                )
                membro_legado_id = uuid4()
                await connection.execute(
                    text(
                        "INSERT INTO usuarios (id, unidade_id, nome, email, perfil_id, ativo) "
                        "SELECT :id, :unidade_id, 'Membro legado', :email, id, true FROM perfis "
                        "WHERE unidade_id=:unidade_id AND codigo='USUARIO_PADRAO'"
                    ),
                    {
                        "id": membro_legado_id,
                        "unidade_id": unidade_id,
                        "email": f"membro-legado-{uuid4()}@sidia.com",
                    },
                )
                await connection.execute(
                    text(
                        "INSERT INTO time_membros (id, unidade_id, time_id, usuario_id, ativo) "
                        "VALUES (:id, :unidade_id, :time_id, :usuario_id, true) "
                        "ON CONFLICT (time_id, usuario_id) DO UPDATE SET ativo=true"
                    ),
                    {
                        "id": uuid4(),
                        "unidade_id": unidade_id,
                        "time_id": team_id,
                        "usuario_id": membro_legado_id,
                    },
                )

                await connection.run_sync(_aplicar_migration)

                caroline = (
                    await connection.execute(
                        select(
                            UsuarioModel.nome,
                            UsuarioModel.email,
                            UsuarioModel.user_id,
                            UsuarioModel.senha_hash,
                            UsuarioModel.senha_alteracao_obrigatoria,
                        ).where(UsuarioModel.id == caroline_id)
                    )
                ).one()
                assert caroline.nome == "Caroline Laís"
                assert caroline.email == "caroline.silva@sidia.com"
                assert caroline.user_id == "caroline.silva"
                assert caroline.senha_alteracao_obrigatoria is True
                assert hasher.verify(caroline.senha_hash, os.environ["SENHA_INICIAL_USUARIOS"])
                assert await connection.scalar(
                    select(TimeModel.setor_id).where(TimeModel.id == team_id)
                ) == await connection.scalar(
                    select(SetorModel.id).where(
                        SetorModel.unidade_id == unidade_id, SetorModel.nome.ilike("svp")
                    )
                )
                assert (
                    await connection.scalar(
                        select(TimeMembroModel.id).where(
                            TimeMembroModel.time_id == team_id,
                            TimeMembroModel.usuario_id == membro_legado_id,
                            TimeMembroModel.ativo.is_(True),
                        )
                    )
                    is not None
                )
                admin_after = (
                    await connection.execute(
                        select(
                            UsuarioModel.id,
                            UsuarioModel.nome,
                            UsuarioModel.email,
                            UsuarioModel.perfil_id,
                            UsuarioModel.auth_version,
                        ).where(UsuarioModel.email == "admin@sdfmanager.com")
                    )
                ).one()
                assert admin_after == admin
                permissions_after = set(
                    (
                        await connection.execute(
                            select(
                                PerfilPermissaoModel.perfil_id, PerfilPermissaoModel.permissao_id
                            )
                        )
                    ).all()
                )
                assert permissions_after == permissions_before
            finally:
                await transaction.rollback()
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_seed_falha_sem_escrever_se_email_e_user_id_apontam_para_contas_diferentes():
    engine = create_async_engine(os.environ["SDF_TEST_DATABASE_URL"])
    try:
        async with engine.connect() as connection:
            transaction = await connection.begin()
            try:
                unidade_id = await connection.scalar(
                    select(UnidadeModel.id).where(UnidadeModel.nome == "Manaus")
                )
                assert unidade_id is not None
                caroline_id = await connection.scalar(
                    select(UsuarioModel.id).where(
                        UsuarioModel.unidade_id == unidade_id,
                        UsuarioModel.user_id == "caroline.silva",
                    )
                )
                assert caroline_id is not None
                await connection.execute(
                    text("UPDATE usuarios SET email='carol@email.com' WHERE id=:id"),
                    {"id": caroline_id},
                )
                email_owner_id = uuid4()
                await connection.execute(
                    text(
                        "INSERT INTO usuarios "
                        "(id, unidade_id, nome, email, user_id, perfil_id, ativo) "
                        "SELECT :id, :unidade_id, 'Conflito', 'caroline.silva@sidia.com', "
                        "'user-id-divergente', id, true FROM perfis "
                        "WHERE unidade_id=:unidade_id AND codigo='USUARIO_PADRAO'"
                    ),
                    {"id": email_owner_id, "unidade_id": unidade_id},
                )
                with pytest.raises(RuntimeError, match="contas diferentes"):
                    await connection.run_sync(_aplicar_migration)
                assert (
                    await connection.scalar(
                        select(UsuarioModel.email).where(UsuarioModel.id == caroline_id)
                    )
                    == "carol@email.com"
                )
                assert (
                    await connection.scalar(
                        select(UsuarioModel.user_id).where(UsuarioModel.id == email_owner_id)
                    )
                    == "user-id-divergente"
                )
            finally:
                await transaction.rollback()
    finally:
        await engine.dispose()


@pytest.mark.asyncio
@pytest.mark.parametrize("precondicao", ["senha_ausente", "perfil_ausente"])
async def test_seed_falha_se_faltar_configuracao_ou_perfil(precondicao, monkeypatch):
    engine = create_async_engine(os.environ["SDF_TEST_DATABASE_URL"])
    try:
        async with engine.connect() as connection:
            transaction = await connection.begin()
            try:
                if precondicao == "senha_ausente":
                    monkeypatch.delenv("SENHA_INICIAL_USUARIOS", raising=False)
                    mensagem = "Defina SENHA_INICIAL_USUARIOS"
                else:
                    unidade_id = await connection.scalar(
                        select(UnidadeModel.id).where(UnidadeModel.nome == "Manaus")
                    )
                    await connection.execute(
                        text(
                            "UPDATE perfis SET codigo='PERFIL_TEMPORARIO' "
                            "WHERE unidade_id=:unidade_id AND codigo='KP'"
                        ),
                        {"unidade_id": unidade_id},
                    )
                    mensagem = "perfil KP"
                with pytest.raises(RuntimeError, match=mensagem):
                    await connection.run_sync(_aplicar_migration)
            finally:
                await transaction.rollback()
    finally:
        await engine.dispose()


def test_aplica_todas_as_migrations_e_semeia_a_organizacao_em_schema_vazio(monkeypatch):
    assert os.environ.get("SENHA_INICIAL_USUARIOS")
    base_url = make_url(os.environ["SDF_TEST_DATABASE_URL"])
    schema = f"test_seed_from_zero_{uuid4().hex}"
    admin_engine = sa.create_engine(base_url)
    schema_engine = None
    config = Config(str(Path(__file__).resolve().parents[2] / "alembic.ini"))

    try:
        with admin_engine.begin() as connection:
            connection.execute(sa.text(f'CREATE SCHEMA "{schema}"'))

        monkeypatch.setenv("DATABASE_URL", os.environ["SDF_TEST_DATABASE_URL"])
        pgoptions = f"{os.environ.get('PGOPTIONS', '')} -c search_path={schema}".strip()
        monkeypatch.setenv("PGOPTIONS", pgoptions)
        schema_engine = sa.create_engine(base_url)
        command.upgrade(config, "0ef76e2d9713")

        with schema_engine.connect() as connection:
            admin_before = connection.execute(
                sa.text(
                    "SELECT id::text, nome, email, perfil_id::text, auth_version "
                    "FROM usuarios WHERE email='admin@sdfmanager.com'"
                )
            ).one()
            permissoes_antes = set(
                connection.execute(
                    sa.text(
                        "SELECT perfil_id::text, permissao_id FROM perfil_permissoes "
                        "ORDER BY perfil_id, permissao_id"
                    )
                ).all()
            )

        command.upgrade(config, "head")

        with schema_engine.connect() as connection:
            assert (
                connection.execute(sa.text("SELECT version_num FROM alembic_version")).scalar_one()
                == "f1a2b3c4d5e6"
            )
            unidade_id = connection.execute(
                sa.text("SELECT id FROM unidades WHERE nome='Manaus'")
            ).scalar_one()
            rows = (
                connection.execute(
                    sa.text(
                        "SELECT u.nome, u.email, u.user_id, p.codigo, u.senha_hash, "
                        "u.senha_alteracao_obrigatoria, u.ativo FROM usuarios u "
                        "JOIN perfis p ON p.id=u.perfil_id WHERE u.unidade_id=:unidade_id "
                        "AND lower(u.email)=ANY(:emails)"
                    ),
                    {"unidade_id": unidade_id, "emails": [email.lower() for email in USUARIOS]},
                )
                .mappings()
                .all()
            )
            assert len(rows) == len(USUARIOS)
            by_email = {row["email"]: row for row in rows}
            hasher = PasswordHasher()
            for email, (nome, user_id, perfil_codigo) in USUARIOS.items():
                user = by_email[email]
                assert (user["nome"], user["user_id"], user["codigo"]) == (
                    nome,
                    user_id,
                    perfil_codigo,
                )
                assert user["ativo"] is True
                assert user["senha_alteracao_obrigatoria"] is True
                assert hasher.verify(user["senha_hash"], os.environ["SENHA_INICIAL_USUARIOS"])

            setor_id = connection.execute(
                sa.text("SELECT id FROM setores WHERE unidade_id=:unidade_id AND nome='SVP'"),
                {"unidade_id": unidade_id},
            ).scalar_one()
            time_id = connection.execute(
                sa.text(
                    "SELECT id FROM times WHERE unidade_id=:unidade_id "
                    "AND lower(nome)='sdf automation' AND setor_id=:setor_id"
                ),
                {"unidade_id": unidade_id, "setor_id": setor_id},
            ).scalar_one()
            assert (
                connection.execute(
                    sa.text(
                        "SELECT count(*) FROM setor_gerentes sg "
                        "JOIN usuarios u ON u.id=sg.usuario_id "
                        "WHERE sg.unidade_id=:unidade_id AND sg.setor_id=:setor_id "
                        "AND u.user_id='ivan.moreira' AND sg.ativo"
                    ),
                    {"unidade_id": unidade_id, "setor_id": setor_id},
                ).scalar_one()
                == 1
            )
            membros = set(
                connection.execute(
                    sa.text(
                        "SELECT u.user_id FROM time_membros tm "
                        "JOIN usuarios u ON u.id=tm.usuario_id "
                        "WHERE tm.time_id=:time_id AND tm.ativo"
                    ),
                    {"time_id": time_id},
                ).scalars()
            )
            assert membros == MEMBROS
            assert (
                connection.execute(
                    sa.text(
                        "SELECT count(*) FROM time_membros tm "
                        "JOIN usuarios u ON u.id=tm.usuario_id "
                        "WHERE tm.time_id=:time_id AND u.user_id='ivan.moreira' AND tm.ativo"
                    ),
                    {"time_id": time_id},
                ).scalar_one()
                == 0
            )
            admin_after = connection.execute(
                sa.text(
                    "SELECT id::text, nome, email, perfil_id::text, auth_version "
                    "FROM usuarios WHERE email='admin@sdfmanager.com'"
                )
            ).one()
            permissoes_depois = set(
                connection.execute(
                    sa.text(
                        "SELECT perfil_id::text, permissao_id FROM perfil_permissoes "
                        "ORDER BY perfil_id, permissao_id"
                    )
                ).all()
            )
            assert admin_after == admin_before
            assert permissoes_depois == permissoes_antes
    finally:
        if schema_engine is not None:
            schema_engine.dispose()
        with admin_engine.begin() as connection:
            connection.execute(sa.text(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE'))
        admin_engine.dispose()
