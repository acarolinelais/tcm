from datetime import datetime
from uuid import UUID

from src.domain.common.entidade_tenant import EntidadeTenant


class RodadaFormFactor(EntidadeTenant):
    SDF_ID_MAX_LENGTH = 50

    def __init__(
        self,
        unidade_id: UUID,
        projeto_id: UUID,
        criada_por: UUID,
        sdf_id: str | None,
        created_at: datetime,
    ) -> None:
        super().__init__(unidade_id)
        if sdf_id is not None and len(sdf_id) > self.SDF_ID_MAX_LENGTH:
            raise ValueError(f"SDF ID deve ter no máximo {self.SDF_ID_MAX_LENGTH} caracteres.")
        self.projeto_id = projeto_id
        self.criada_por = criada_por
        self.sdf_id = sdf_id
        self.created_at = created_at
