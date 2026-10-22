from datetime import datetime
from uuid import UUID, uuid4


class EntityBase:
    """Base para entidades de domínio: identidade, estado ativo/inativo e datas de auditoria.

    As datas são preenchidas pela infraestrutura ao persistir; a entidade de domínio só expõe
    os campos e os métodos de negócio para alterar o estado.
    """

    def __init__(self) -> None:
        self.id: UUID = uuid4()
        self.ativo: bool = True
        self.created_at: datetime | None = None
        self.updated_at: datetime | None = None

    def ativar(self) -> None:
        self.ativo = True

    def inativar(self) -> None:
        self.ativo = False
