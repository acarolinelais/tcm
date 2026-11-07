from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass(frozen=True)
class UltimaImportacaoSdf:
    """O que o diálogo de desfazer mostra (spec 067, RN-03)."""

    id: UUID
    sdf_id: str
    device: str
    data_execucao: datetime
    importado_por_nome: str
    importado_em: datetime
