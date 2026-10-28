from datetime import UTC, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from src.domain.entities.caso_teste import (
    CasoTeste,
    CategoriaCasoTeste,
    DificuldadeCasoTeste,
    SituacaoCasoTeste,
    StatusCasoTeste,
)


class CriarCasoTesteRequest(BaseModel):
    tc_id: str = Field(min_length=1, max_length=CasoTeste.TC_ID_MAX_LENGTH)
    category: CategoriaCasoTeste
    difficulty: DificuldadeCasoTeste
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
    situation: SituacaoCasoTeste | None = None
    status: StatusCasoTeste | None = None
    responsavel_id: UUID | None = None
    backup_id: UUID | None = None
    justificativa_exclusao: str | None = Field(
        default=None, max_length=CasoTeste.JUSTIFICATIVA_EXCLUSAO_MAX_LENGTH
    )

    # "before": o limite vale para o texto sem os espaços das pontas; só espaços conta como vazio.
    @field_validator("justificativa_exclusao", mode="before")
    @classmethod
    def normalizar_justificativa(cls, justificativa: object) -> object:
        if isinstance(justificativa, str):
            return justificativa.strip() or None
        return justificativa

    @model_validator(mode="after")
    def exigir_campo(self):
        if not self.model_fields_set:
            raise ValueError("Informe ao menos um campo para atualizar o Test Case.")
        # Spec 026: excluir exige justificativa, e a justificativa só acompanha a exclusão.
        excluindo = self.status is StatusCasoTeste.CANCELLED
        if excluindo and not self.justificativa_exclusao:
            raise ValueError("Informe a justificativa para excluir o Test Case.")
        if not excluindo and self.justificativa_exclusao:
            raise ValueError("A justificativa só pode ser enviada ao excluir o Test Case.")
        return self


class CasoTesteResponse(BaseModel):
    id: UUID
    unidade_id: UUID
    projeto_id: UUID
    tc_id: str
    category: CategoriaCasoTeste
    difficulty: DificuldadeCasoTeste
    situation: SituacaoCasoTeste
    status: StatusCasoTeste
    responsavel_id: UUID
    backup_id: UUID | None
    justificativa_exclusao: str | None
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
        status=caso.status,
        responsavel_id=caso.responsavel_id,
        backup_id=caso.backup_id,
        justificativa_exclusao=caso.justificativa_exclusao,
        ativo=caso.ativo,
        created_at=_timestamp_utc(caso.created_at),
        updated_at=_timestamp_utc(caso.updated_at),
    )


def _timestamp_utc(valor: datetime | None) -> datetime | None:
    if valor is None:
        return None
    return valor.replace(tzinfo=UTC) if valor.tzinfo is None else valor.astimezone(UTC)
