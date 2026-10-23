from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from src.domain.entities.usuario import Usuario


class CriarUsuarioRequest(BaseModel):
    nome: str = Field(min_length=1, max_length=Usuario.NOME_MAX_LENGTH)
    email: EmailStr = Field(max_length=Usuario.EMAIL_MAX_LENGTH)


class AtualizarUsuarioRequest(CriarUsuarioRequest):
    pass


class UsuarioResponse(BaseModel):
    id: UUID
    nome: str
    email: str
    ativo: bool
    perfil_id: UUID | None = None
    created_at: datetime


def to_response(u: Usuario) -> UsuarioResponse:
    return UsuarioResponse(
        id=u.id,
        nome=u.nome,
        email=u.email,
        ativo=u.ativo,
        perfil_id=u.perfil_id,
        created_at=u.created_at,
    )
