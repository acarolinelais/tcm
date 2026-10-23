from fastapi import APIRouter, Depends

from src.api.dependencies import get_auth_service
from src.application.schemas.auth import LoginRequest, TokenResponse
from src.application.services.auth_service import AuthServiceImpl

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest, service: AuthServiceImpl = Depends(get_auth_service)
) -> TokenResponse:
    return await service.login(request)
