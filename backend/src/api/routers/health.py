from fastapi import APIRouter

router = APIRouter(prefix="/api/health", tags=["health"])


@router.get("")
async def health() -> dict[str, str]:
    # Pública: o processo subiu e as migrations rodaram (healthcheck do Compose, ADR 0034).
    return {"status": "ok"}
