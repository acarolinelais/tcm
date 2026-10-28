from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, field_validator, model_validator

from src.domain.entities.caso_teste import (
    CasoTeste,
    CategoriaCasoTeste,
    DificuldadeCasoTeste,
    NivelAutomacaoCasoTeste,
    SituacaoCasoTeste,
    StatusCasoTeste,
)


def _exigir_inteiro_como_nivel(valor: object) -> object:
    # O enum inteiro aceitaria `true` (como 1), "2" e 2.0: o nível é um inteiro de 1 a 3, nada além.
    if valor is not None and (isinstance(valor, bool) or not isinstance(valor, int)):
        raise ValueError("Automation Level deve ser 1, 2 ou 3.")
    return valor


NivelAutomacaoOpcional = Annotated[
    NivelAutomacaoCasoTeste | None, BeforeValidator(_exigir_inteiro_como_nivel)
]


class CriarCasoTesteRequest(BaseModel):
    tc_id: str = Field(min_length=1, max_length=CasoTeste.TC_ID_MAX_LENGTH)
    category: CategoriaCasoTeste
    difficulty: DificuldadeCasoTeste
    automation_level: NivelAutomacaoOpcional = None
    situation: SituacaoCasoTeste
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
    # Omitido ou null mantém o nível: depois de definido ele não é esvaziado (spec 026, RN-13).
    automation_level: NivelAutomacaoOpcional = None
    situation: SituacaoCasoTeste | None = None
    status: StatusCasoTeste | None = None
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
    automation_level: NivelAutomacaoCasoTeste | None
    situation: SituacaoCasoTeste
    status: StatusCasoTeste
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
        automation_level=caso.automation_level,
        situation=caso.situation,
        status=caso.status,
        responsavel_id=caso.responsavel_id,
        backup_id=caso.backup_id,
        ativo=caso.ativo,
        created_at=_timestamp_utc(caso.created_at),
        updated_at=_timestamp_utc(caso.updated_at),
    )


def _timestamp_utc(valor: datetime | None) -> datetime | None:
    if valor is None:
        return None
    return valor.replace(tzinfo=UTC) if valor.tzinfo is None else valor.astimezone(UTC)
