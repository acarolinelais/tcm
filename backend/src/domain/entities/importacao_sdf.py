from uuid import UUID

from src.domain.common.entidade_tenant import EntidadeTenant


class ImportacaoSdf(EntidadeTenant):
    def __init__(self, unidade_id: UUID, projeto_id: UUID, importado_por: UUID) -> None:
        super().__init__(unidade_id)
        self.projeto_id = projeto_id
        self.importado_por = importado_por
