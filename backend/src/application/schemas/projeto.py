from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from src.domain.entities.projeto import Projeto, StatusProjeto


class CriarProjetoRequest(BaseModel):
    time_id: UUID
    app: str = Field(min_length=1, max_length=Projeto.APP_MAX_LENGTH)
    one_ui: str = Field(min_length=1, max_length=Projeto.ONE_UI_MAX_LENGTH)
    modelos_ids: list[UUID] = Field(default_factory=list)

    @field_validator("app", "one_ui")
    @classmethod
    def limpar_texto(cls, valor: str) -> str:
        valor = valor.strip()
        if not valor:
            raise ValueError("O campo é obrigatório.")
        return valor


class AtualizarStatusProjetoRequest(BaseModel):
    status: StatusProjeto


class ProjetoResponse(BaseModel):
    id: UUID
    unidade_id: UUID
    time_id: UUID
    app: str
    one_ui: str
    nome: str
    status: StatusProjeto
    ativo: bool
    created_at: datetime | None
    updated_at: datetime | None


def to_response(projeto: Projeto) -> ProjetoResponse:
    return ProjetoResponse(
        id=projeto.id,
        unidade_id=projeto.unidade_id,
        time_id=projeto.time_id,
        app=projeto.app,
        one_ui=projeto.one_ui,
        nome=projeto.nome,
        status=projeto.status,
        ativo=projeto.ativo,
        created_at=projeto.created_at,
        updated_at=projeto.updated_at,
    )
