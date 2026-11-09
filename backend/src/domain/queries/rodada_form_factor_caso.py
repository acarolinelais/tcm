from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class RodadaFormFactorCaso:
    execucao_id: UUID
    caso_teste_id: UUID
    tc_id: str
    responsavel_id: UUID
    backup_id: UUID | None
    status: str
    resultados: dict[UUID, str]
    resultados_registrados: bool
