from uuid import UUID

from src.domain.common.entidade_tenant import EntidadeTenant


class ProjetoModelo(EntidadeTenant):
    def __init__(self, unidade_id: UUID, projeto_id: UUID, modelo_dispositivo_id: UUID) -> None:
        super().__init__(unidade_id)
        self.projeto_id = projeto_id
        self.modelo_dispositivo_id = modelo_dispositivo_id
