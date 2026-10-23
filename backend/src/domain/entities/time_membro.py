from uuid import UUID

from src.domain.common.entidade_tenant import EntidadeTenant
from src.domain.common.papel_time import PapelTime


class TimeMembro(EntidadeTenant):
    def __init__(
        self, unidade_id: UUID, time_id: UUID, usuario_id: UUID, papel: PapelTime = PapelTime.DEV
    ) -> None:
        super().__init__(unidade_id)
        self.time_id = time_id
        self.usuario_id = usuario_id
        self.papel = papel

    def marcar_como_kp(self) -> None:
        self.papel = PapelTime.KP

    def marcar_como_dev(self) -> None:
        self.papel = PapelTime.DEV
