from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from src.domain.entities.caso_teste import (
    CasoTeste,
    CategoriaCasoTeste,
    DificuldadeCasoTeste,
    SituacaoCasoTeste,
)


class CriarCasoTesteRequest(BaseModel):
    tc_id: str = Field(min_length=1, max_length=CasoTeste.TC_ID_MAX_LENGTH)
    category: CategoriaCasoTeste
    difficulty: DificuldadeCasoTeste
    responsavel_id: UUID
    backup_id: UUID

    @field_validator("tc_id")
    @classmethod
    def normalizar_tc_id(cls, tc_id: str) -> str:
        tc_id = tc_id.strip()
        if not tc_id:
            raise ValueError("TC ID é obrigatório.")
        return tc_id


class AtualizarCasoTesteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    category: CategoriaCasoTeste | None = None
    difficulty: DificuldadeCasoTeste | None = None
    situation: SituacaoCasoTeste | None = None
    responsavel_id: UUID | None = None
    backup_id: UUID | None = None

    @model_validator(mode="after")
    def exigir_campo(self):
        if not self.model_fields_set:
            raise ValueError("Informe ao menos um campo para atualizar o Test Case.")
        return self


class CasoTesteResponse(BaseModel):
    id: UUID
    unidade_id: UUID
    projeto_id: UUID
    tc_id: str
    category: CategoriaCasoTeste
    difficulty: DificuldadeCasoTeste
    situation: SituacaoCasoTeste
    responsavel_id: UUID
    backup_id: UUID | None
    ativo: bool
    created_at: datetime | None
    updated_at: datetime | None


def to_response(caso: CasoTeste) -> CasoTesteResponse:
    return CasoTesteResponse(
        id=caso.id,
        unidade_id=caso.unidade_id,
        projeto_id=caso.projeto_id,
        tc_id=caso.tc_id,
        category=caso.category,
        difficulty=caso.difficulty,
        situation=caso.situation,
        responsavel_id=caso.responsavel_id,
        backup_id=caso.backup_id,
        ativo=caso.ativo,
        created_at=caso.created_at,
        updated_at=caso.updated_at,
    )
