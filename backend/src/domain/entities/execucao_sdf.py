from datetime import datetime
from uuid import UUID

from src.domain.common.entidade_tenant import EntidadeTenant


class ExecucaoSdf(EntidadeTenant):
    SDF_ID_MAX_LENGTH = 120
    ONE_UI_MAX_LENGTH = 40

    def __init__(
        self,
        unidade_id: UUID,
        importacao_sdf_id: UUID,
        caso_teste_id: UUID,
        sdf_id: str,
        data_reportada: datetime,
        one_ui: str,
    ) -> None:
        super().__init__(unidade_id)
        self.importacao_sdf_id = importacao_sdf_id
        self.caso_teste_id = caso_teste_id
        self.sdf_id = self._validar_texto(sdf_id, "SDF ID", self.SDF_ID_MAX_LENGTH)
        self.data_reportada = data_reportada
        self.one_ui = self._validar_texto(one_ui, "One UI", self.ONE_UI_MAX_LENGTH)

    @staticmethod
    def _validar_texto(valor: str, campo: str, limite: int) -> str:
        normalizado = valor.strip()
        if not normalizado:
            raise ValueError(f"{campo} é obrigatório.")
        if len(normalizado) > limite:
            raise ValueError(f"{campo} deve ter no máximo {limite} caracteres.")
        return normalizado
