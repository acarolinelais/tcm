from uuid import UUID

from src.domain.common.entidade_tenant import EntidadeTenant
from src.domain.entities.caso_teste import StatusCasoTeste


class ImportacaoSdfStatus(EntidadeTenant):
    """Status que uma importação SDF aplicou num caso (spec 067), para desfazer depois."""

    def __init__(
        self,
        unidade_id: UUID,
        importacao_sdf_id: UUID,
        caso_teste_id: UUID,
        status_aplicado: StatusCasoTeste,
    ) -> None:
        super().__init__(unidade_id)
        self.importacao_sdf_id = importacao_sdf_id
        self.caso_teste_id = caso_teste_id
        self.status_aplicado = status_aplicado
