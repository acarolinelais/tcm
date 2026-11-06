"""Contexto que os triggers de auditoria leem da transação: quem escreve e de onde (ADR 0044)."""

from contextvars import ContextVar
from uuid import UUID

from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

usuario_auditoria: ContextVar[UUID | None] = ContextVar("usuario_auditoria", default=None)
tela_auditoria: ContextVar[str | None] = ContextVar("tela_auditoria", default=None)

TELA_MAX_LENGTH = 500


def tela_da_requisicao(cabecalho: str | None) -> str | None:
    """Caminho da tela que o front manda no cabeçalho X-Tela, sem query nem fragmento.

    O valor vem do navegador: é contexto para quem audita, não prova (ADR 0044).
    """
    if not cabecalho or not cabecalho.startswith("/"):
        return None
    caminho = cabecalho.split("?", 1)[0].split("#", 1)[0]
    return caminho[:TELA_MAX_LENGTH]


@event.listens_for(Session, "after_begin")
def _aplicar_usuario(session, transaction, connection) -> None:
    # set_config(..., true) vale só até o fim da transação: cada transação nova recebe o usuário
    # e a tela de novo. Sem usuário (login, seeds, scripts), o trigger grava o registro sem autor.
    usuario = usuario_auditoria.get()
    if usuario is not None:
        connection.execute(
            text(
                "SELECT set_config('app.usuario_id', :usuario, true), "
                "set_config('app.tela', :tela, true)"
            ),
            {"usuario": str(usuario), "tela": tela_auditoria.get() or ""},
        )


class ContextoAuditoriaImpl:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def definir_origem(self, origem: str) -> None:
        # Só a transação aberta: o service dá um commit por caso de uso (ADR 0004), e a origem não
        # passa para a próxima escrita.
        await self._session.execute(
            text("SELECT set_config('app.origem', :origem, true)"), {"origem": origem}
        )
