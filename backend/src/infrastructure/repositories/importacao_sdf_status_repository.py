from datetime import datetime
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.entities.caso_teste import StatusCasoTeste
from src.domain.entities.importacao_sdf_status import ImportacaoSdfStatus
from src.domain.queries.auditoria import OrigemAuditoria
from src.infrastructure.data.models.importacao_sdf_status_model import ImportacaoSdfStatusModel

# O `>=` vale porque a auditoria grava com clock_timestamp(), depois do now() que preencheu o
# created_at da importação; os dois usam o fuso da sessão.
_REVERTIVEIS = text(
    """
    SELECT s.id, s.caso_teste_id, s.status_aplicado
    FROM importacoes_sdf_status s
    WHERE s.unidade_id = :unidade_id
      AND s.importacao_sdf_id = :importacao_id
      AND (
          SELECT array_agg(a.new_values ->> 'status' ORDER BY a.id)
          FROM auditoria_alteracoes a
          WHERE a.table_name = 'casos_teste'
            AND a.row_id = s.caso_teste_id
            AND a.operation = 'UPDATE'
            AND 'status' = ANY (a.changed_fields)
            AND a.created_at >= CAST(:importado_em AS TIMESTAMP)
      ) = ARRAY[s.status_aplicado::TEXT]
    """
)


# Spec 072, RN-08: o caso entrou em In Validation depois do Dev Fix e da última correção
# concluída. O `dev_fix_em` é UTC sem fuso; o `created_at` da importação usa o fuso da sessão.
# A volta de uma importação desfeita não é uma correção. Uma consulta para todos os casos da
# importação, no lugar de uma por caso.
_ENTRARAM_EM_VALIDACAO = text(
    """
    SELECT c.id
    FROM casos_teste c
    WHERE c.unidade_id = :unidade_id
      AND c.id = ANY(:caso_ids)
      AND c.dev_fix_em IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM auditoria_alteracoes a
        WHERE a.unidade_id = :unidade_id
          AND a.table_name = 'casos_teste'
          AND a.row_id = c.id
          AND a.operation = 'UPDATE'
          AND 'status' = ANY (a.changed_fields)
          AND a.new_values ->> 'status' = :em_validacao
          AND a.origem IS DISTINCT FROM :desfeita
          AND a.created_at > GREATEST(
              CAST(c.dev_fix_em AS TIMESTAMP) AT TIME ZONE 'UTC',
              (
                  SELECT CAST(max(i.created_at) AS TIMESTAMPTZ)
                  FROM importacoes_sdf_status s
                  JOIN importacoes_sdf i ON i.id = s.importacao_sdf_id
                  WHERE s.unidade_id = :unidade_id
                    AND s.caso_teste_id = c.id
                    AND s.concluiu_correcao
                    AND i.ativo
              )
          )
      )
    """
)


class ImportacaoSdfStatusRepositoryImpl:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def adicionar(self, entity: ImportacaoSdfStatus) -> None:
        self.session.add(
            ImportacaoSdfStatusModel(
                id=entity.id,
                unidade_id=entity.unidade_id,
                importacao_sdf_id=entity.importacao_sdf_id,
                caso_teste_id=entity.caso_teste_id,
                status_aplicado=entity.status_aplicado.value,
                concluiu_correcao=entity.concluiu_correcao,
            )
        )

    async def entraram_em_validacao_depois_do_dev_fix(
        self, unidade_id: UUID, caso_ids: list[UUID]
    ) -> set[UUID]:
        linhas = await self.session.execute(
            _ENTRARAM_EM_VALIDACAO,
            {
                "unidade_id": unidade_id,
                "caso_ids": caso_ids,
                "em_validacao": StatusCasoTeste.IN_VALIDATION.value,
                "desfeita": OrigemAuditoria.IMPORTACAO_SDF_DESFEITA.value,
            },
        )
        return {linha.id for linha in linhas}

    async def listar_revertiveis(
        self, unidade_id: UUID, importacao_sdf_id: UUID, importado_em: datetime
    ) -> tuple[ImportacaoSdfStatus, ...]:
        linhas = await self.session.execute(
            _REVERTIVEIS,
            {
                "unidade_id": unidade_id,
                "importacao_id": importacao_sdf_id,
                "importado_em": importado_em,
            },
        )
        resultado = []
        for id_, caso_teste_id, status in linhas:
            item = ImportacaoSdfStatus(
                unidade_id, importacao_sdf_id, caso_teste_id, StatusCasoTeste(status)
            )
            item.id = id_
            resultado.append(item)
        return tuple(resultado)
