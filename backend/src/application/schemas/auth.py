from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from src.domain.entities.usuario import Usuario


class LoginRequest(BaseModel):
    email: EmailStr = Field(max_length=Usuario.EMAIL_MAX_LENGTH)
    senha: str = Field(min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str = ""
    expires_in: int = 900
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=32)


class AlterarSenhaRequest(BaseModel):
    nova_senha: str = Field(min_length=12, max_length=128)


class PerfilAtualResponse(BaseModel):
    id: UUID
    nome: str
    email: str
    unidade_id: UUID
    unidade_nome: str
    perfil_codigo: str | None
    perfil: str | None
    permissoes: list[str]
    times: list[dict[str, str]]
    setores_gerenciados: list[UUID]
    time_atual_id: UUID | None
    tem_multiplos_times: bool
    senha_alteracao_obrigatoria: bool
