from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from src.domain.entities.setor import Setor


class CriarSetorRequest(BaseModel):
    nome: str = Field(min_length=1, max_length=Setor.NOME_MAX_LENGTH)
    gerente_id: UUID | None = None

    @field_validator("nome")
    @classmethod
    def nome_nao_pode_ser_vazio(cls, nome: str) -> str:
        nome = nome.strip()
        if not nome:
            raise ValueError("O nome do setor é obrigatório.")
        return nome


class AtualizarSetorRequest(BaseModel):
    nome: str | None = Field(default=None, min_length=1, max_length=Setor.NOME_MAX_LENGTH)
    ativo: bool | None = None

    @field_validator("nome")
    @classmethod
    def nome_nao_pode_ser_vazio(cls, nome: str | None) -> str | None:
        if nome is None:
            return nome
        nome = nome.strip()
        if not nome:
            raise ValueError("O nome do setor é obrigatório.")
        return nome


class SetorGerenteRequest(BaseModel):
    usuario_id: UUID


class SetorGerenteResponse(BaseModel):
    setor_id: UUID
    usuario_id: UUID
    ativo: bool


class SetorResponse(BaseModel):
    id: UUID
    unidade_id: UUID
    nome: str
    ativo: bool


def to_response(s: Setor) -> SetorResponse:
    return SetorResponse(id=s.id, unidade_id=s.unidade_id, nome=s.nome, ativo=s.ativo)
