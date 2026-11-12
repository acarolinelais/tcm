from datetime import datetime
from uuid import UUID

from src.domain.common.entidade_tenant import EntidadeTenant
from src.domain.entities.rodada_form_factor import RodadaFormFactor


class ExecucaoSdf(EntidadeTenant):
    ORIGENS = ("SDF", "MANUAL")
    SDF_ID_MAX_LENGTH = 120
    ONE_UI_MAX_LENGTH = 40
    ORIGEM_MAX_LENGTH = 20

    def __init__(
        self,
        unidade_id: UUID,
        importacao_sdf_id: UUID | None,
        caso_teste_id: UUID,
        sdf_id: str | None,
        data_reportada: datetime,
        one_ui: str,
        origem: str = "SDF",
        rodada_id: UUID | None = None,
        resultados_registrados: bool = False,
    ) -> None:
        super().__init__(unidade_id)
        if origem not in self.ORIGENS:
            raise ValueError("Origem da execução inválida.")
        if origem == "SDF" and (importacao_sdf_id is None or sdf_id is None):
            raise ValueError("Execução SDF exige importação e SDF ID.")
        if origem == "MANUAL" and importacao_sdf_id is not None:
            raise ValueError("Execução manual não pode pertencer a uma importação SDF.")
        if origem == "MANUAL" and rodada_id is None and sdf_id is not None:
            raise ValueError("Execução manual sem rodada não pode ter SDF ID.")
        if origem == "SDF" and rodada_id is not None:
            raise ValueError("Execução importada não pode pertencer a uma rodada manual.")
        self.importacao_sdf_id = importacao_sdf_id
        self.rodada_id = rodada_id
        self.caso_teste_id = caso_teste_id
        if sdf_id is None:
            self.sdf_id = None
        elif rodada_id is not None:
            if len(sdf_id) > RodadaFormFactor.SDF_ID_MAX_LENGTH:
                raise ValueError(
                    f"SDF ID deve ter no máximo {RodadaFormFactor.SDF_ID_MAX_LENGTH} caracteres."
                )
            self.sdf_id = sdf_id
        else:
            self.sdf_id = self._validar_texto(sdf_id, "SDF ID", self.SDF_ID_MAX_LENGTH)
        self.data_reportada = data_reportada
        self.one_ui = self._validar_texto(one_ui, "One UI", self.ONE_UI_MAX_LENGTH)
        self.origem = origem
        self.resultados_registrados = resultados_registrados
        # Spec 073: a tentativa de correção do caso depois de aplicar o resultado desta execução.
        self.tentativa_correcao: int | None = None

    @staticmethod
    def _validar_texto(valor: str, campo: str, limite: int) -> str:
        normalizado = valor.strip()
        if not normalizado:
            raise ValueError(f"{campo} é obrigatório.")
        if len(normalizado) > limite:
            raise ValueError(f"{campo} deve ter no máximo {limite} caracteres.")
        return normalizado
