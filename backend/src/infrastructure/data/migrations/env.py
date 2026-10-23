import os
from logging.config import fileConfig

from alembic import context
from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool
from src.infrastructure.data.base import Base
from src.infrastructure.data.models.auth_sessao_model import AuthSessaoModel  # noqa: F401
from src.infrastructure.data.models.perfil_model import PerfilModel  # noqa: F401
from src.infrastructure.data.models.permissao_model import PerfilPermissaoModel, PermissaoModel  # noqa: F401
from src.infrastructure.data.models.setor_model import SetorModel  # noqa: F401
from src.infrastructure.data.models.time_membro_model import TimeMembroModel  # noqa: F401
from src.infrastructure.data.models.time_model import TimeModel  # noqa: F401
from src.infrastructure.data.models.unidade_model import UnidadeModel  # noqa: F401
from src.infrastructure.data.models.usuario_model import UsuarioModel  # noqa: F401

load_dotenv()

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config
config.set_main_option("sqlalchemy.url", os.environ["DATABASE_URL"])

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Modelos são importados aqui só para registrar as tabelas em Base.metadata antes do autogenerate.
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
