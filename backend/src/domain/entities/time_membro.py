from uuid import UUID

from src.domain.common.entidade_tenant import EntidadeTenant


class TimeMembro(EntidadeTenant):
    def __init__(self, unidade_id: UUID, time_id: UUID, usuario_id: UUID) -> None:
        super().__init__(unidade_id)
        self.time_id = time_id
        self.usuario_id = usuario_id
