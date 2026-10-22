from pathlib import Path

from alembic import command
from alembic.config import Config

ALEMBIC_INI_PATH = Path(__file__).resolve().parents[3] / "alembic.ini"


def aplicar_migrations() -> None:
    config = Config(str(ALEMBIC_INI_PATH))
    command.upgrade(config, "head")
