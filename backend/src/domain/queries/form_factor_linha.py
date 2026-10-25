from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass(frozen=True)
class FormFactorLinha:
    caso_teste_id: UUID
    tc_id: str
    responsavel_id: UUID
    sdf_id: str | None
    data_reportada: datetime | None
    resultados: dict[UUID, str]


@dataclass(frozen=True)
class FormFactorExecucaoLinha:
    execucao_id: UUID
    caso_teste_id: UUID
    tc_id: str
    responsavel_id: UUID
    sdf_id: str | None
    data_reportada: datetime
    origem: str
    resultados: dict[UUID, str]
