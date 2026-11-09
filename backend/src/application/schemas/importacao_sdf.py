from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from src.domain.queries.ultima_importacao_sdf import UltimaImportacaoSdf


class ImportarRelatorioSdfResponse(BaseModel):
    importacao_id: UUID
    quantidade_execucoes: int
    quantidade_resultados: int


class UltimaImportacaoSdfResponse(BaseModel):
    id: UUID
    sdf_id: str
    device: str
    data_execucao: datetime
    importado_por_nome: str
    importado_em: datetime

    @classmethod
    def from_query(cls, ultima: UltimaImportacaoSdf) -> "UltimaImportacaoSdfResponse":
        return cls(
            id=ultima.id,
            sdf_id=ultima.sdf_id,
            device=ultima.device,
            data_execucao=ultima.data_execucao,
            importado_por_nome=ultima.importado_por_nome,
            importado_em=ultima.importado_em,
        )


class DesfazerImportacaoSdfResponse(BaseModel):
    casos_revertidos: int
