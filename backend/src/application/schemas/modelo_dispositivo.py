from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

from src.domain.entities.modelo_dispositivo import ModeloDispositivo


class CriarModeloDispositivoRequest(BaseModel):
    nome: str = Field(min_length=1, max_length=ModeloDispositivo.NOME_MAX_LENGTH)

    @field_validator("nome")
    @classmethod
    def normalizar_nome(cls, nome: str) -> str:
        nome = nome.strip()
        if not nome:
            raise ValueError("O nome do modelo é obrigatório.")
        return nome


class AtualizarModeloDispositivoRequest(BaseModel):
    nome: str | None = Field(
        default=None, min_length=1, max_length=ModeloDispositivo.NOME_MAX_LENGTH
    )
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
        if self.nome is None and self.ativo is None:
            raise ValueError("Informe o nome ou o estado do modelo para atualizar.")
        return self


class ModeloDispositivoResponse(BaseModel):
    id: UUID
    unidade_id: UUID
    nome: str
    ativo: bool


def to_response(modelo: ModeloDispositivo) -> ModeloDispositivoResponse:
    return ModeloDispositivoResponse(
        id=modelo.id,
        unidade_id=modelo.unidade_id,
        nome=modelo.nome,
        ativo=modelo.ativo,
    )
