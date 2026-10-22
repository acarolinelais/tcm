from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from scalar_fastapi import get_scalar_api_reference

from src.api.error_handling.handlers import registrar_handlers
from src.api.routers.usuarios import router as usuarios_router
from src.infrastructure.data.migrations_runner import aplicar_migrations


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    aplicar_migrations()
    yield


app = FastAPI(title="SDF Manager", lifespan=lifespan)
registrar_handlers(app)
app.include_router(usuarios_router)


@app.get("/scalar", include_in_schema=False)
def scalar_docs():
    return get_scalar_api_reference(openapi_url=app.openapi_url, title=app.title)
