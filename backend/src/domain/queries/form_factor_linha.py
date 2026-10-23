from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass(frozen=True)
class FormFactorLinha:
    tc_id: str
    sdf_id: str
    modelo_dispositivo_id: UUID
    modelo_nome: str
    resultado: str
    data_reportada: datetime
    one_ui: str
