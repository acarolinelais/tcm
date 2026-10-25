import os
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest
import sqlalchemy as sa
from alembic.config import Config
from sqlalchemy.engine import make_url


@pytest.fixture
def schema_alembic(monkeypatch):
    """Schema vazio e descartável para aplicar migrations do zero sem tocar no banco de teste."""
    base_url = make_url(os.environ["SDF_TEST_DATABASE_URL"])
    schema = f"test_migrations_{uuid4().hex}"
    admin_engine = sa.create_engine(base_url)
    with admin_engine.begin() as connection:
        connection.execute(sa.text(f'CREATE SCHEMA "{schema}"'))

    monkeypatch.setenv("DATABASE_URL", os.environ["SDF_TEST_DATABASE_URL"])
    pgoptions = f"{os.environ.get('PGOPTIONS', '')} -c search_path={schema}".strip()
    monkeypatch.setenv("PGOPTIONS", pgoptions)
    engine = sa.create_engine(base_url)
    try:
        yield SimpleNamespace(
            config=Config(str(Path(__file__).resolve().parents[2] / "alembic.ini")),
            schema=schema,
            engine=engine,
        )
    finally:
        engine.dispose()
        with admin_engine.begin() as connection:
            connection.execute(sa.text(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE'))
        admin_engine.dispose()
