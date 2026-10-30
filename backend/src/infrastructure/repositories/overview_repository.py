from datetime import datetime
from uuid import UUID

from sqlalchemy import Text, column, distinct, func, or_, select, table
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.entities.caso_teste import StatusCasoTeste
from src.domain.queries.resumo_overview import EscopoOverview, ResumoOverview
from src.infrastructure.data.models.caso_teste_model import CasoTesteModel
from src.infrastructure.data.models.projeto_model import ProjetoModel

# Escrita só pelos triggers (ADR 0044): aqui basta a forma da tabela para a leitura.
_auditoria = table(
    "auditoria_alteracoes",
    column("unidade_id"),
    column("table_name"),
    column("operation"),
    column("row_id"),
    column("new_values", JSONB),
    column("changed_fields", ARRAY(Text)),
    column("created_at"),
)

_EM_ANDAMENTO = (
    StatusCasoTeste.IN_PROGRESS.value,
    StatusCasoTeste.IN_REVIEW.value,
    StatusCasoTeste.IN_VALIDATION.value,
    StatusCasoTeste.IN_FIXES.value,
)


class OverviewRepositoryImpl:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def resumir(
        self,
        unidade_id: UUID,
        escopo: EscopoOverview,
        usuario_id: UUID,
        desde: datetime,
        fuso_horario: str,
    ) -> ResumoOverview:
        filtros = [
            CasoTesteModel.unidade_id == unidade_id,
            CasoTesteModel.ativo.is_(True),
            ProjetoModel.ativo.is_(True),
            CasoTesteModel.status != StatusCasoTeste.CANCELLED.value,
        ]
        if escopo.time_ids is not None:
            filtros.append(ProjetoModel.time_id.in_(escopo.time_ids))
        if escopo.pessoa_id is not None:
            filtros.append(
                or_(
                    CasoTesteModel.responsavel_id == escopo.pessoa_id,
                    CasoTesteModel.backup_id == escopo.pessoa_id,
                )
            )
        casos = (
            select(CasoTesteModel.id)
            .join(ProjetoModel, ProjetoModel.id == CasoTesteModel.projeto_id)
            .where(*filtros)
        )

        status = CasoTesteModel.status
        contagens = (
            await self._session.execute(
                # Mesmo FROM e filtros dos `casos`: cards e desempenho contam os mesmos casos.
                casos.with_only_columns(
                    func.count(),
                    func.count().filter(status == StatusCasoTeste.DONE.value),
                    func.count().filter(status.in_(_EM_ANDAMENTO)),
                    func.count().filter(status == StatusCasoTeste.TO_DO.value),
                    func.count().filter(CasoTesteModel.responsavel_id == usuario_id),
                )
            )
        ).one()

        # Entrou em Done: criado já em Done ou com o Status mudado para Done (RN-04).
        mes = func.to_char(func.timezone(fuso_horario, _auditoria.c.created_at), "YYYY-MM")
        por_mes = await self._session.execute(
            select(mes.label("mes"), func.count(distinct(_auditoria.c.row_id)))
            .where(
                _auditoria.c.unidade_id == unidade_id,
                _auditoria.c.table_name == CasoTesteModel.__tablename__,
                _auditoria.c.created_at >= desde,
                _auditoria.c.new_values["status"].astext == StatusCasoTeste.DONE.value,
                or_(
                    _auditoria.c.operation == "INSERT",
                    _auditoria.c.changed_fields.contains(["status"]),
                ),
                _auditoria.c.row_id.in_(casos),
            )
            # Pelo rótulo: repetir a expressão geraria outro parâmetro para o fuso.
            .group_by("mes")
        )
        return ResumoOverview(*contagens, concluidos_por_mes=dict(por_mes.all()))
