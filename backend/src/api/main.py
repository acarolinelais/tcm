from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from scalar_fastapi import get_scalar_api_reference

from src.api.error_handling.handlers import registrar_handlers
from src.api.routers.auth import router as auth_router
from src.api.routers.health import router as health_router
from src.api.routers.modelos_dispositivo import router as modelos_dispositivo_router
from src.api.routers.perfis import router as perfis_router
from src.api.routers.projetos import router as projetos_router
from src.api.routers.setores import router as setores_router
from src.api.routers.test_cases import router as test_cases_router
from src.api.routers.times import router as times_router
from src.api.routers.usuarios import router as usuarios_router
from src.infrastructure.data.migrations_runner import aplicar_migrations
from src.infrastructure.security.jwt import validar_configuracao_jwt


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    validar_configuracao_jwt()
    aplicar_migrations()
    yield


app = FastAPI(title="SDF Manager", lifespan=lifespan)
registrar_handlers(app)
app.include_router(health_router)
app.include_router(usuarios_router)
app.include_router(auth_router)
app.include_router(setores_router)
app.include_router(times_router)
app.include_router(perfis_router)
app.include_router(projetos_router)
app.include_router(test_cases_router)
app.include_router(modelos_dispositivo_router)


@app.get("/scalar", include_in_schema=False)
def scalar_docs():
    return get_scalar_api_reference(openapi_url=app.openapi_url, title=app.title)
