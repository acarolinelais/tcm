from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class UsuarioAutenticado:
    """Identidade do JWT (ADR 0014), passada aos services pra autorização (ADR 0015)."""

    id: UUID
    unidade_id: UUID
    admin_unidade: bool
    nome: str = ""
    email: str = ""
    perfil: str = ""
    permissoes: frozenset[str] = frozenset()
    time_ids: tuple[UUID, ...] = ()
    times_gerenciados: tuple[UUID, ...] = ()
    time_atual_id: UUID | None = None
    sessao_id: UUID | None = None

    def pode(self, permissao: str) -> bool:
        return self.admin_unidade or permissao in self.permissoes
