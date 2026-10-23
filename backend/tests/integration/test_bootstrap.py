import os

os.environ.setdefault(
    "DATABASE_URL",
    os.environ.get(
        "SDF_TEST_DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/sdf_manager"
    ),
)
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-functional-tests-0123456789")
os.environ.setdefault("BOOTSTRAP_ADMIN_SENHA", "mude-esta-senha")

import pytest
from argon2 import PasswordHasher
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from src.api.main import app
from src.infrastructure.data.models.unidade_model import UnidadeModel
from src.infrastructure.data.models.usuario_model import UsuarioModel

pytestmark = pytest.mark.skipif(
    not os.environ.get("SDF_TEST_DATABASE_URL"),
    reason="Defina SDF_TEST_DATABASE_URL para executar a integração com Postgres.",
)


@pytest.mark.asyncio
async def test_migration_cria_unidade_manaus_com_admin():
    engine = create_async_engine(os.environ["SDF_TEST_DATABASE_URL"])
    try:
        async with async_sessionmaker(engine)() as session:
            result = await session.execute(
                select(UnidadeModel, UsuarioModel)
                .join(UsuarioModel, UsuarioModel.unidade_id == UnidadeModel.id)
                .where(
                    UnidadeModel.nome == "Manaus",
                    UsuarioModel.email == "admin@sdfmanager.com",
                )
            )
            unidade, admin = result.one()
            assert unidade.nome == "Manaus"
            assert admin.admin_unidade is True
            assert admin.senha_hash is not None
            assert PasswordHasher().verify(admin.senha_hash, os.environ["BOOTSTRAP_ADMIN_SENHA"])
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
