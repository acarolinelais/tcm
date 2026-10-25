from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from src.domain.entities.projeto import Projeto, StatusProjeto


class CriarProjetoRequest(BaseModel):
    time_id: UUID
    nome: str | None = Field(default=None, max_length=Projeto.NOME_MAX_LENGTH)
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

    @field_validator("nome")
    @classmethod
    def limpar_nome(cls, valor: str | None) -> str | None:
        if valor is None:
            return None
        valor = valor.strip()
        if not valor:
            raise ValueError("O campo é obrigatório.")
        return valor


class AtualizarStatusProjetoRequest(BaseModel):
    status: StatusProjeto


class AtualizarProjetoRequest(BaseModel):
    nome: str | None = Field(default=None, max_length=Projeto.NOME_MAX_LENGTH)
    app: str = Field(min_length=1, max_length=Projeto.APP_MAX_LENGTH)
    one_ui: str = Field(min_length=1, max_length=Projeto.ONE_UI_MAX_LENGTH)
    time_id: UUID | None = None
    modelos_ids: list[UUID] | None = None

    @field_validator("app", "one_ui")
    @classmethod
    def limpar_texto(cls, valor: str) -> str:
        valor = valor.strip()
        if not valor:
            raise ValueError("O campo é obrigatório.")
        return valor

    @field_validator("nome")
    @classmethod
    def limpar_nome(cls, valor: str | None) -> str | None:
        if valor is None:
            return None
        valor = valor.strip()
        if not valor:
            raise ValueError("O campo é obrigatório.")
        return valor


class ProjetoResponse(BaseModel):
    id: UUID
    unidade_id: UUID
    time_id: UUID
    app: str
    one_ui: str
    nome: str
    status: StatusProjeto
    modelos_dispositivo: list[str] = Field(default_factory=list)
    modelos_ids: list[UUID] = Field(default_factory=list)
    ativo: bool
    created_at: datetime | None
    updated_at: datetime | None


def to_response(
    projeto: Projeto,
    modelos_dispositivo: list[str] | None = None,
    modelos_ids: list[UUID] | None = None,
) -> ProjetoResponse:
    return ProjetoResponse(
        id=projeto.id,
        unidade_id=projeto.unidade_id,
        time_id=projeto.time_id,
        app=projeto.app,
        one_ui=projeto.one_ui,
        nome=projeto.nome,
        status=projeto.status,
        modelos_dispositivo=modelos_dispositivo or [],
        modelos_ids=modelos_ids or [],
        ativo=projeto.ativo,
        created_at=projeto.created_at,
        updated_at=projeto.updated_at,
    )
