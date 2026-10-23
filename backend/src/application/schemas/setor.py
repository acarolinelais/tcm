from uuid import UUID

from pydantic import BaseModel, Field

from src.domain.entities.setor import Setor


class CriarSetorRequest(BaseModel):
    nome: str = Field(min_length=1, max_length=Setor.NOME_MAX_LENGTH)


class SetorResponse(BaseModel):
    id: UUID
    unidade_id: UUID
    nome: str
    ativo: bool


def to_response(s: Setor) -> SetorResponse:
    return SetorResponse(id=s.id, unidade_id=s.unidade_id, nome=s.nome, ativo=s.ativo)
