from uuid import UUID

from pydantic import BaseModel, Field

from src.application.schemas.projeto import ProjetoResponse


class ImportarProjetoPlanilhaResponse(BaseModel):
    projeto: ProjetoResponse
    quantidade_casos: int


class ImportarProjetoPlanilhaRequest(BaseModel):
    time_id: UUID
    modelos_ids: list[UUID] = Field(default_factory=list)
