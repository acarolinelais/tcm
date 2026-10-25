from uuid import UUID

from pydantic import BaseModel


class ImportarRelatorioSdfResponse(BaseModel):
    importacao_id: UUID
    quantidade_execucoes: int
    quantidade_resultados: int
