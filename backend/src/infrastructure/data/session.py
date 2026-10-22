import asyncio
import os
import sys
from collections.abc import AsyncGenerator

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

load_dotenv()

if sys.platform == "win32":
    # psycopg (modo assíncrono) não roda sobre o ProactorEventLoop, padrão do asyncio no Windows.
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

engine = create_async_engine(os.environ["DATABASE_URL"])
SessionFactory = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncGenerator[AsyncSession]:
    async with SessionFactory() as session:
        yield session
