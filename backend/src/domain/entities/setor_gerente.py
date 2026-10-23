from uuid import UUID

from src.domain.common.entidade_tenant import EntidadeTenant


class SetorGerente(EntidadeTenant):
    """Associação de escopo entre gerente e setor, isolada por unidade."""

    def __init__(self, unidade_id: UUID, setor_id: UUID, usuario_id: UUID) -> None:
        super().__init__(unidade_id)
        self.setor_id = setor_id
        self.usuario_id = usuario_id
