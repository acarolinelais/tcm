from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.queries.registro_auditoria import RegistroAuditoria

# A tabela é escrita pelos triggers, não pelo ORM, por isso a leitura é em SQL (ADR 0044).
_LISTAR = text(
    """
    SELECT a.table_name, a.operation, a.old_values, a.new_values, a.changed_fields,
           a.origem, a.created_at, a.usuario_nome, a.perfil_nome
    FROM auditoria_alteracoes a
    WHERE a.unidade_id = :unidade_id
      AND (
        (a.table_name = 'casos_teste' AND a.row_id = :caso_id)
        OR (
          a.table_name = 'links_pull_request'
          AND a.row_id IN (
            SELECT id FROM links_pull_request
            WHERE caso_teste_id = :caso_id AND unidade_id = :unidade_id
          )
        )
      )
    ORDER BY a.created_at DESC, a.id DESC
    """
)


class HistoricoCasoTesteRepositoryImpl:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def listar(self, unidade_id: UUID, caso_teste_id: UUID) -> list[RegistroAuditoria]:
        linhas = await self._session.execute(
            _LISTAR, {"unidade_id": unidade_id, "caso_id": caso_teste_id}
        )
        return [
            RegistroAuditoria(
                table_name=linha.table_name,
                operation=linha.operation,
                old_values=linha.old_values,
                new_values=linha.new_values,
                changed_fields=tuple(linha.changed_fields or ()),
                usuario_nome=linha.usuario_nome,
                usuario_perfil=linha.perfil_nome,
                origem=linha.origem,
                created_at=linha.created_at,
            )
            for linha in linhas
        ]
