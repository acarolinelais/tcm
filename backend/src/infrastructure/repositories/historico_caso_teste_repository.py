from datetime import datetime
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.common.cor_avatar import CorAvatar
from src.domain.queries.registro_auditoria import RegistroAuditoria, RegistroTimeline

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

# shortcut: traz o período inteiro (até 31 dias) e agrupa em Python; serve para centenas de mudanças
# por mês num projeto; agrupar no SQL e paginar por coluna quando o volume pedir (spec 054).
_LISTAR_POR_PROJETO = text(
    """
    SELECT a.table_name, a.operation, a.old_values, a.new_values, a.changed_fields,
           a.origem, a.created_at, a.usuario_nome, a.perfil_nome,
           c.id AS caso_teste_id, c.tc_id, c.title, c.responsavel_id,
           r.nome AS responsavel_nome, r.cor_avatar AS responsavel_cor_avatar
    FROM auditoria_alteracoes a
    LEFT JOIN links_pull_request l
      ON a.table_name = 'links_pull_request' AND l.id = a.row_id AND l.unidade_id = a.unidade_id
    JOIN casos_teste c
      ON c.id = CASE WHEN a.table_name = 'casos_teste' THEN a.row_id ELSE l.caso_teste_id END
     AND c.unidade_id = a.unidade_id
    JOIN usuarios r ON r.id = c.responsavel_id AND r.unidade_id = c.unidade_id
    WHERE a.unidade_id = :unidade_id
      AND a.table_name IN ('casos_teste', 'links_pull_request')
      AND c.projeto_id = :projeto_id
      AND a.created_at >= :inicio AND a.created_at < :fim
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
        return [_registro(linha) for linha in linhas]

    async def listar_por_projeto(
        self, unidade_id: UUID, projeto_id: UUID, inicio: datetime, fim: datetime
    ) -> list[RegistroTimeline]:
        linhas = await self._session.execute(
            _LISTAR_POR_PROJETO,
            {"unidade_id": unidade_id, "projeto_id": projeto_id, "inicio": inicio, "fim": fim},
        )
        return [
            RegistroTimeline(
                registro=_registro(linha),
                caso_teste_id=linha.caso_teste_id,
                tc_id=linha.tc_id,
                title=linha.title,
                responsavel_id=linha.responsavel_id,
                responsavel_nome=linha.responsavel_nome,
                responsavel_cor_avatar=CorAvatar(linha.responsavel_cor_avatar or CorAvatar.AZUL),
            )
            for linha in linhas
        ]


def _registro(linha) -> RegistroAuditoria:
    return RegistroAuditoria(
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
