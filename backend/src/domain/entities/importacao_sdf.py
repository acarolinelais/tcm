from datetime import UTC, datetime
from uuid import UUID

from src.domain.common.entidade_tenant import EntidadeTenant


class ImportacaoSdf(EntidadeTenant):
    def __init__(self, unidade_id: UUID, projeto_id: UUID, importado_por: UUID) -> None:
        super().__init__(unidade_id)
        self.projeto_id = projeto_id
        self.importado_por = importado_por
        self.desfeita_por: UUID | None = None
        self.desfeita_em: datetime | None = None

    def desfazer(self, usuario_id: UUID) -> None:
        """Spec 067, RN-04: a importação desfeita sai das telas e continua registrada."""
        if not self.ativo:
            raise ValueError("A importação já foi desfeita.")
        self.ativo = False
        self.desfeita_por = usuario_id
        self.desfeita_em = datetime.now(UTC).replace(tzinfo=None)
