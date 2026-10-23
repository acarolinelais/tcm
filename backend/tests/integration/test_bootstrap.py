import os
from importlib import import_module
from uuid import uuid4

os.environ.setdefault(
    "DATABASE_URL",
    os.environ.get(
        "SDF_TEST_DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/sdf_manager"
    ),
)
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-functional-tests-0123456789")
os.environ.setdefault("BOOTSTRAP_ADMIN_SENHA", "mude-esta-senha")

import pytest
from alembic.operations import Operations
from alembic.runtime.migration import MigrationContext
from argon2 import PasswordHasher
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from src.api.main import app
from src.infrastructure.data.models.perfil_model import PerfilModel
from src.infrastructure.data.models.permissao_model import PerfilPermissaoModel
from src.infrastructure.data.models.unidade_model import UnidadeModel
from src.infrastructure.data.models.usuario_model import UsuarioModel

pytestmark = pytest.mark.skipif(
    not os.environ.get("SDF_TEST_DATABASE_URL"),
    reason="Defina SDF_TEST_DATABASE_URL para executar a integração com Postgres.",
)

PERMISSOES_PROJETOS = {
    "projetos.consultar",
    "projetos.gerenciar",
    "test_cases.consultar",
    "test_cases.gerenciar",
    "form_factor.consultar",
    "form_factor.importar",
}


@pytest.mark.asyncio
async def test_migration_cria_unidade_manaus_com_admin():
    engine = create_async_engine(os.environ["SDF_TEST_DATABASE_URL"])
    try:
        async with async_sessionmaker(engine)() as session:
            result = await session.execute(
                select(UnidadeModel, UsuarioModel, PerfilModel)
                .join(UsuarioModel, UsuarioModel.unidade_id == UnidadeModel.id)
                .join(PerfilModel, PerfilModel.id == UsuarioModel.perfil_id)
                .where(
                    UnidadeModel.nome == "Manaus",
                    UsuarioModel.email == "admin@sdfmanager.com",
                )
            )
            unidade, admin, perfil = result.one()
            assert unidade.nome == "Manaus"
            assert perfil.codigo == "ADMIN_UNIDADE"
            assert admin.senha_hash is not None
            assert admin.idioma_preferido == "en"
            assert PasswordHasher().verify(admin.senha_hash, os.environ["BOOTSTRAP_ADMIN_SENHA"])
            permissoes_admin = set(
                (
                    await session.execute(
                        select(PerfilPermissaoModel.permissao_id).where(
                            PerfilPermissaoModel.perfil_id == perfil.id
                        )
                    )
                ).scalars()
            )
            assert "usuarios.perfil.consultar" in permissoes_admin
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_migration_seed_gerente_e_responsavel_usuario():
    engine = create_async_engine(os.environ["SDF_TEST_DATABASE_URL"])
    try:
        async with async_sessionmaker(engine)() as session:
            gerente = await session.scalar(
                select(PerfilModel).where(PerfilModel.codigo == "GERENTE")
            )
            assert gerente is not None
            permissoes = set(
                (
                    await session.execute(
                        select(PerfilPermissaoModel.permissao_id).where(
                            PerfilPermissaoModel.perfil_id == gerente.id
                        )
                    )
                ).scalars()
            )
            assert {
                "usuarios.consultar",
                "usuarios.perfil.consultar",
                "usuarios.gerenciar",
                "times.consultar",
                "times.criar",
                "times.gerenciar",
            } <= permissoes
            assert await session.scalar(select(UsuarioModel.responsavel_id).limit(1)) is None
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_migration_seed_permissoes_de_projetos_por_perfil():
    engine = create_async_engine(os.environ["SDF_TEST_DATABASE_URL"])
    try:
        async with async_sessionmaker(engine)() as session:
            perfis = (
                await session.execute(
                    select(PerfilModel).where(
                        PerfilModel.codigo.in_(("ADMIN_UNIDADE", "GERENTE", "KP", "USUARIO_PADRAO"))
                    )
                )
            ).scalars()
            permissoes_por_codigo = {}
            for perfil in perfis:
                permissoes_por_codigo[perfil.codigo] = set(
                    (
                        await session.execute(
                            select(PerfilPermissaoModel.permissao_id).where(
                                PerfilPermissaoModel.perfil_id == perfil.id
                            )
                        )
                    ).scalars()
                )

            assert PERMISSOES_PROJETOS <= permissoes_por_codigo["ADMIN_UNIDADE"]
            assert PERMISSOES_PROJETOS <= permissoes_por_codigo["GERENTE"]
            assert PERMISSOES_PROJETOS <= permissoes_por_codigo["KP"]
            assert {
                "projetos.consultar",
                "test_cases.consultar",
                "form_factor.consultar",
            } <= permissoes_por_codigo["USUARIO_PADRAO"]
            assert "form_factor.importar" not in permissoes_por_codigo["USUARIO_PADRAO"]
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_migration_seed_perfil_kp_por_unidade_e_idempotente():
    engine = create_async_engine(os.environ["SDF_TEST_DATABASE_URL"])
    try:
        async with engine.connect() as connection:
            transaction = await connection.begin()
            try:
                total_antes = await connection.scalar(
                    select(func.count()).select_from(PerfilModel).where(PerfilModel.codigo == "KP")
                )

                def reaplicar_migration(sync_connection):
                    migration = import_module(
                        "src.infrastructure.data.migrations.versions."
                        "c0d1e2f3a4b5_perfil_kp_por_unidade"
                    )
                    with Operations.context(MigrationContext.configure(sync_connection)):
                        migration.upgrade()

                await connection.run_sync(reaplicar_migration)
                total_depois = await connection.scalar(
                    select(func.count()).select_from(PerfilModel).where(PerfilModel.codigo == "KP")
                )
                unidades_duplicadas = await connection.scalar(
                    select(func.count()).select_from(
                        select(PerfilModel.unidade_id)
                        .where(PerfilModel.codigo == "KP")
                        .group_by(PerfilModel.unidade_id)
                        .having(func.count(PerfilModel.id) > 1)
                        .subquery()
                    )
                )

                assert total_antes >= 1
                assert total_depois == total_antes
                assert unidades_duplicadas == 0
            finally:
                await transaction.rollback()
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_migration_converte_membros_kp_ativos_e_remove_papel_legado():
    engine = create_async_engine(os.environ["SDF_TEST_DATABASE_URL"])
    schema = f"test_kp_migration_{uuid4().hex}"
    unidade_1, unidade_2 = uuid4(), uuid4()
    perfil_padrao_1, perfil_padrao_2 = uuid4(), uuid4()
    perfil_kp_1, perfil_kp_2 = uuid4(), uuid4()
    usuario_ativo, usuario_inativo, usuario_dev, usuario_outra_unidade = (uuid4() for _ in range(4))
    time_1, time_2 = uuid4(), uuid4()
    try:
        async with engine.connect() as connection:
            transaction = await connection.begin()
            try:
                await connection.execute(text(f'CREATE SCHEMA "{schema}"'))
                await connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
                await connection.execute(
                    text("CREATE TABLE perfis (id uuid, unidade_id uuid, codigo text)")
                )
                await connection.execute(
                    text(
                        "CREATE TABLE usuarios (id uuid, unidade_id uuid, "
                        "perfil_id uuid, auth_version integer)"
                    )
                )
                await connection.execute(
                    text(
                        "CREATE TABLE time_membros (id uuid, unidade_id uuid, "
                        "time_id uuid, usuario_id uuid, ativo boolean, "
                        "papel varchar(10) NOT NULL)"
                    )
                )
                await connection.execute(
                    text(
                        "INSERT INTO perfis (id, unidade_id, codigo) VALUES "
                        "(:default_1, :unit_1, 'USUARIO_PADRAO'), (:kp_1, :unit_1, 'KP'), "
                        "(:default_2, :unit_2, 'USUARIO_PADRAO'), (:kp_2, :unit_2, 'KP')"
                    ),
                    {
                        "default_1": perfil_padrao_1,
                        "unit_1": unidade_1,
                        "kp_1": perfil_kp_1,
                        "default_2": perfil_padrao_2,
                        "unit_2": unidade_2,
                        "kp_2": perfil_kp_2,
                    },
                )
                await connection.execute(
                    text(
                        "INSERT INTO usuarios (id, unidade_id, perfil_id, auth_version) VALUES "
                        "(:active, :unit_1, :default_1, 4), (:inactive, :unit_1, :default_1, 7), "
                        "(:dev, :unit_1, :default_1, 2), (:other, :unit_1, :default_1, 3)"
                    ),
                    {
                        "active": usuario_ativo,
                        "inactive": usuario_inativo,
                        "dev": usuario_dev,
                        "other": usuario_outra_unidade,
                        "unit_1": unidade_1,
                        "default_1": perfil_padrao_1,
                    },
                )
                await connection.execute(
                    text(
                        "INSERT INTO time_membros (id, unidade_id, time_id, "
                        "usuario_id, ativo, papel) VALUES "
                        "(:id1, :unit_1, :time_1, :active, true, 'kp'), "
                        "(:id2, :unit_1, :time_1, :inactive, false, 'kp'), "
                        "(:id3, :unit_1, :time_1, :dev, true, 'dev'), "
                        "(:id4, :unit_2, :time_2, :other, true, 'kp')"
                    ),
                    {
                        "id1": uuid4(),
                        "id2": uuid4(),
                        "id3": uuid4(),
                        "id4": uuid4(),
                        "unit_1": unidade_1,
                        "time_1": time_1,
                        "active": usuario_ativo,
                        "inactive": usuario_inativo,
                        "dev": usuario_dev,
                        "unit_2": unidade_2,
                        "time_2": time_2,
                        "other": usuario_outra_unidade,
                    },
                )

                def aplicar_migration(sync_connection):
                    migration = import_module(
                        "src.infrastructure.data.migrations.versions."
                        "d1e2f3a4b5c6_perfil_kp_substitui_papel_time"
                    )
                    with Operations.context(MigrationContext.configure(sync_connection)):
                        migration.upgrade()

                await connection.run_sync(aplicar_migration)
                perfis_usuarios = dict(
                    (await connection.execute(text("SELECT id, perfil_id FROM usuarios"))).all()
                )
                auth_versions = dict(
                    (await connection.execute(text("SELECT id, auth_version FROM usuarios"))).all()
                )
                colunas = (
                    (
                        await connection.execute(
                            text(
                                "SELECT column_name FROM information_schema.columns "
                                "WHERE table_schema = :schema AND table_name = 'time_membros'"
                            ),
                            {"schema": schema},
                        )
                    )
                    .scalars()
                    .all()
                )

                assert perfis_usuarios[usuario_ativo] == perfil_kp_1
                assert perfis_usuarios[usuario_inativo] == perfil_padrao_1
                assert perfis_usuarios[usuario_dev] == perfil_padrao_1
                assert perfis_usuarios[usuario_outra_unidade] == perfil_padrao_1
                assert auth_versions[usuario_ativo] == 5
                assert auth_versions[usuario_inativo] == 7
                assert "papel" not in colunas
            finally:
                await transaction.rollback()
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_admin_bootstrap_real_consegue_fazer_login():
    app.dependency_overrides.clear()
    async with AsyncClient(
        transport=ASGITransport(app=app, raise_app_exceptions=False), base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/auth/login",
            json={
                "email": "admin@sdfmanager.com",
                "senha": os.environ["BOOTSTRAP_ADMIN_SENHA"],
            },
        )
    assert response.status_code == 200
    assert response.json()["token_type"] == "bearer"
    assert response.json()["access_token"]
    async with AsyncClient(
        transport=ASGITransport(app=app, raise_app_exceptions=False), base_url="http://test"
    ) as client:
        perfil = await client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {response.json()['access_token']}"},
        )
    assert perfil.status_code == 200
    assert perfil.json()["idioma_preferido"] == "en"
