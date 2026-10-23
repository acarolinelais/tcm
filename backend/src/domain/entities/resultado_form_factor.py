from uuid import UUID

from src.domain.common.entidade_tenant import EntidadeTenant


class ResultadoFormFactor(EntidadeTenant):
    RESULTADO_MAX_LENGTH = 40

    def __init__(
        self,
        unidade_id: UUID,
        execucao_sdf_id: UUID,
        modelo_dispositivo_id: UUID,
        resultado: str,
    ) -> None:
        super().__init__(unidade_id)
        self.execucao_sdf_id = execucao_sdf_id
        self.modelo_dispositivo_id = modelo_dispositivo_id
        normalizado = resultado.strip()
        if not normalizado:
            raise ValueError("Resultado do modelo é obrigatório.")
        if len(normalizado) > self.RESULTADO_MAX_LENGTH:
            raise ValueError(
                f"Resultado do modelo deve ter no máximo {self.RESULTADO_MAX_LENGTH} caracteres."
            )
        self.resultado = normalizado
