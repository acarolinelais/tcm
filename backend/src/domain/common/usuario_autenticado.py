from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class UsuarioAutenticado:
    """Identidade do JWT (ADR 0014), passada aos services pra autorização (ADR 0015)."""

    id: UUID
    unidade_id: UUID
    perfil_codigo: str | None = None
    nome: str = ""
    email: str = ""
    perfil: str = ""
    permissoes: frozenset[str] = frozenset()
    time_ids: tuple[UUID, ...] = ()
    times_gerenciados: tuple[UUID, ...] = ()
    time_atual_id: UUID | None = None
    sessao_id: UUID | None = None

    def pode(self, permissao: str) -> bool:
        return self.eh_administrador or permissao in self.permissoes

    @property
    def eh_administrador(self) -> bool:
        return self.perfil_codigo == "ADMIN_UNIDADE"
