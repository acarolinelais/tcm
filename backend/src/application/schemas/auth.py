from pydantic import BaseModel, EmailStr, Field

from src.domain.entities.usuario import Usuario


class LoginRequest(BaseModel):
    email: EmailStr = Field(max_length=Usuario.EMAIL_MAX_LENGTH)
    senha: str = Field(min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
