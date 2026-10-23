from uuid import UUID

from pydantic import BaseModel, Field


class CriarPerfilRequest(BaseModel):
    nome: str = Field(min_length=1, max_length=100)
    descricao: str | None = Field(default=None, max_length=300)
    permissoes: list[str] = Field(default_factory=list)


class DefinirPermissoesRequest(BaseModel):
    permissoes: list[str]


class AtribuirPerfilRequest(BaseModel):
    perfil_id: UUID


class PerfilResponse(BaseModel):
    id: UUID
    nome: str
    descricao: str | None
    permissoes: list[str]
    codigo: str | None = None


class ModuloPermissaoResponse(BaseModel):
    codigo: str
    nome: str
    ordem: int


class PermissaoResponse(BaseModel):
    id: str
    descricao: str
    modulo: ModuloPermissaoResponse
    ordem: int
