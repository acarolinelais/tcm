from uuid import UUID

from src.domain.common.entidade_tenant import EntidadeTenant
from src.domain.entities.caso_teste import StatusCasoTeste


class ImportacaoSdfStatus(EntidadeTenant):
    def __init__(
        self,
        unidade_id: UUID,
        importacao_sdf_id: UUID,
        caso_teste_id: UUID,
        status_aplicado: StatusCasoTeste,
        concluiu_correcao: bool = False,
        status_anterior: StatusCasoTeste | None = None,
    ) -> None:
        super().__init__(unidade_id)
        self.importacao_sdf_id = importacao_sdf_id
        self.caso_teste_id = caso_teste_id
        self.status_aplicado = status_aplicado
        # Spec 076, RN-06: o desfazer devolve este Status (Done, numa regressão).
        self.status_anterior = status_anterior
        # Spec 072, RN-08: este Done encerrou a correção do Dev Fix; as falhas até aqui saem.
        self.concluiu_correcao = concluiu_correcao
