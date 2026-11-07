from datetime import datetime
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.entities.caso_teste import StatusCasoTeste
from src.domain.entities.importacao_sdf_status import ImportacaoSdfStatus
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
            )
        )

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
