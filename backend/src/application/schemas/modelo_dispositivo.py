from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

from src.domain.entities.modelo_dispositivo import ModeloDispositivo


class CriarModeloDispositivoRequest(BaseModel):
    nome: str = Field(min_length=1, max_length=ModeloDispositivo.NOME_MAX_LENGTH)
    descricao: str | None = Field(default=None, max_length=ModeloDispositivo.DESCRICAO_MAX_LENGTH)

    @field_validator("nome")
    @classmethod
    def normalizar_nome(cls, nome: str) -> str:
        nome = nome.strip()
        if not nome:
            raise ValueError("O nome do modelo é obrigatório.")
        return nome


class AtualizarModeloDispositivoRequest(BaseModel):
    """`descricao` ausente preserva o valor; `null` ou texto vazio limpa a descrição."""

    nome: str | None = Field(
        default=None, min_length=1, max_length=ModeloDispositivo.NOME_MAX_LENGTH
    )
    descricao: str | None = Field(default=None, max_length=ModeloDispositivo.DESCRICAO_MAX_LENGTH)
    ativo: bool | None = None

    @field_validator("nome")
    @classmethod
    def normalizar_nome(cls, nome: str | None) -> str | None:
        if nome is None:
            return None
        nome = nome.strip()
        if not nome:
            raise ValueError("O nome do modelo é obrigatório.")
        return nome

    @model_validator(mode="after")
    def exigir_alteracao(self):
        if self.nome is None and "descricao" not in self.model_fields_set and self.ativo is None:
            raise ValueError("Informe o nome, a descrição ou o estado do modelo para atualizar.")
        return self


class ModeloDispositivoResponse(BaseModel):
    id: UUID
    unidade_id: UUID
    nome: str
    descricao: str | None
    ativo: bool
    created_at: datetime | None
    updated_at: datetime | None


class ModeloDispositivoOpcaoResponse(BaseModel):
    id: UUID
    nome: str


def to_response(modelo: ModeloDispositivo) -> ModeloDispositivoResponse:
    return ModeloDispositivoResponse(
        id=modelo.id,
        unidade_id=modelo.unidade_id,
        nome=modelo.nome,
        descricao=modelo.descricao,
        ativo=modelo.ativo,
        created_at=modelo.created_at,
        updated_at=modelo.updated_at,
    )


def to_opcao_response(modelo: ModeloDispositivo) -> ModeloDispositivoOpcaoResponse:
    return ModeloDispositivoOpcaoResponse(id=modelo.id, nome=modelo.nome)
