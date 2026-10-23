from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from src.domain.entities.usuario import Usuario


class CriarUsuarioRequest(BaseModel):
    nome: str = Field(min_length=1, max_length=Usuario.NOME_MAX_LENGTH)
    email: EmailStr = Field(max_length=Usuario.EMAIL_MAX_LENGTH)
    perfil_id: UUID | None = None


class AtualizarUsuarioRequest(CriarUsuarioRequest):
    pass


class AtribuirResponsavelRequest(BaseModel):
    responsavel_id: UUID | None


class UsuarioResponse(BaseModel):
    id: UUID
    nome: str
    email: str
    ativo: bool
    perfil_id: UUID
    perfil_nome: str | None = None
    perfil_codigo: str | None = None
    responsavel_id: UUID | None
    setores: list[str] = Field(default_factory=list)
    created_at: datetime


def to_response(u: Usuario) -> UsuarioResponse:
    return UsuarioResponse(
        id=u.id,
        nome=u.nome,
        email=u.email,
        ativo=u.ativo,
        perfil_id=u.perfil_id,
        responsavel_id=u.responsavel_id,
        created_at=u.created_at,
    )
