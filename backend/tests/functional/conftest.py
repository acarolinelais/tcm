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
from httpx import ASGITransport, AsyncClient
from src.api.main import app


def dependency_override(value):
    async def override():
        return value

    return override


@pytest.fixture
async def api_client():
    app.dependency_overrides.clear()
    async with AsyncClient(
        transport=ASGITransport(app=app, raise_app_exceptions=False), base_url="http://test"
    ) as client:
        yield client
    app.dependency_overrides.clear()
