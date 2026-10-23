from uuid import UUID

from pydantic import BaseModel, Field


class CriarPerfilRequest(BaseModel):
    nome: str = Field(min_length=1, max_length=100)
    descricao: str | None = Field(default=None, max_length=300)


class DefinirPermissoesRequest(BaseModel):
    permissoes: list[str]


class AtribuirPerfilRequest(BaseModel):
    perfil_id: UUID | None


class PerfilResponse(BaseModel):
    id: UUID
    nome: str
    descricao: str | None
    permissoes: list[str]
