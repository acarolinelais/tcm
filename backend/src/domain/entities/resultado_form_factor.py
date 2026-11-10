from uuid import UUID

from src.domain.common.entidade_tenant import EntidadeTenant


class ResultadoFormFactor(EntidadeTenant):
    RESULTADO_MAX_LENGTH = 40
    DESCRICAO_MAX_LENGTH = 2000
    # Spec 072, RN-01: só estes não são falha; FAIL, EXCEPTION, None e o resto são.
    NAO_FALHA = frozenset({"PASS", "N/A", "NA", "CHECK"})

    @classmethod
    def eh_falha(cls, resultado: str) -> bool:
        return resultado.strip().upper() not in cls.NAO_FALHA

    def __init__(
        self,
        unidade_id: UUID,
        execucao_sdf_id: UUID,
        modelo_dispositivo_id: UUID,
        resultado: str,
        descricao: str | None = None,
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
        # Description do relatório SDF (spec 060); vem com espaços e tabs nas pontas.
        descricao = (descricao or "").strip() or None
        if descricao and len(descricao) > self.DESCRICAO_MAX_LENGTH:
            raise ValueError(
                f"Descrição do resultado deve ter no máximo {self.DESCRICAO_MAX_LENGTH} caracteres."
            )
        self.descricao = descricao
