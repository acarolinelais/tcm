from uuid import UUID

from sqlalchemy import (
    BigInteger,
    Text,
    Uuid,
    and_,
    case,
    cast,
    column,
    func,
    literal,
    select,
    table,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, TIMESTAMP
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.common.paged_result import PagedResult
from src.domain.queries.auditoria import (
    CAMPOS_OCULTOS,
    AcaoAuditoria,
    FiltrosAuditoria,
    LinhaAuditoria,
)
from src.domain.queries.registro_auditoria import RegistroAuditoria
from src.infrastructure.data.models.caso_teste_model import CasoTesteModel
from src.infrastructure.data.models.projeto_model import ProjetoModel

# Escrita só pelos triggers (ADR 0044): aqui basta a forma da tabela para a leitura.
_a = table(
    "auditoria_alteracoes",
    column("id", BigInteger),
    column("unidade_id", Uuid),
    column("table_name", Text),
    column("operation", Text),
    column("row_id", Uuid),
    column("old_values", JSONB),
    column("new_values", JSONB),
    column("changed_fields", ARRAY(Text)),
    column("usuario_id", Uuid),
    column("usuario_nome", Text),
    column("perfil_nome", Text),
    column("origem", Text),
    column("tela", Text),
    column("created_at", TIMESTAMP(timezone=True)),
)

_LINKS = "links_pull_request"
_CASOS = CasoTesteModel.__tablename__

# O registro de um link guarda o caso no JSON da linha; o de um caso, no próprio row_id.
_caso_id = case(
    (_a.c.table_name == _CASOS, _a.c.row_id),
    else_=cast(
        func.coalesce(
            _a.c.new_values["caso_teste_id"].astext, _a.c.old_values["caso_teste_id"].astext
        ),
        Uuid,
    ),
)

# Mesmo recorte do histórico da 038: só a criação, as mudanças em campos visíveis e a inclusão e a
# remoção (inativação) de um link. Os demais registros ficam sem ação e não aparecem.
_acao = case(
    (
        and_(_a.c.table_name == _CASOS, _a.c.operation == "INSERT"),
        literal(AcaoAuditoria.CRIACAO.value),
    ),
    (
        and_(
            _a.c.table_name == _CASOS,
            _a.c.operation == "UPDATE",
            ~_a.c.changed_fields.contained_by(sorted(CAMPOS_OCULTOS)),
        ),
        literal(AcaoAuditoria.ALTERACAO.value),
    ),
    (
        and_(_a.c.table_name == _LINKS, _a.c.operation == "INSERT"),
        literal(AcaoAuditoria.PR_INCLUIDO.value),
    ),
    (
        and_(
            _a.c.table_name == _LINKS,
            _a.c.operation == "UPDATE",
            _a.c.changed_fields.any_() == "ativo",
            _a.c.new_values["ativo"].astext == "false",
        ),
        literal(AcaoAuditoria.PR_REMOVIDO.value),
    ),
)


class AuditoriaRepositoryImpl:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def listar(
        self, unidade_id: UUID, filtros: FiltrosAuditoria, page: int, page_size: int
    ) -> PagedResult[LinhaAuditoria]:
        registros = (
            select(_a, _caso_id.label("caso_id"), _acao.label("acao"))
            .where(_a.c.unidade_id == unidade_id)
            .subquery()
        )
        r = registros.c
        condicoes = [r.acao.is_not(None)]
        if filtros.inicio is not None:
            condicoes.append(r.created_at >= filtros.inicio)
        if filtros.fim is not None:
            condicoes.append(r.created_at < filtros.fim)
        if filtros.usuario_ids:
            condicoes.append(r.usuario_id.in_(filtros.usuario_ids))
        if filtros.perfil:
            condicoes.append(r.perfil_nome == filtros.perfil)
        if filtros.acao is not None:
            condicoes.append(r.acao == filtros.acao.value)
        if filtros.origem is not None:
            condicoes.append(r.origem == filtros.origem.value)
        if filtros.tela and filtros.tela.strip():
            condicoes.append(r.tela.ilike(f"%{filtros.tela.strip()}%"))
        if filtros.tc_id and filtros.tc_id.strip():
            condicoes.append(CasoTesteModel.tc_id.ilike(f"%{filtros.tc_id.strip()}%"))
        if filtros.projeto_id is not None:
            condicoes.append(CasoTesteModel.projeto_id == filtros.projeto_id)

        def consulta(*colunas):
            # O join pela unidade também garante que um caso de outra unidade nunca entra.
            return (
                select(*colunas)
                .select_from(registros)
                .join(
                    CasoTesteModel,
                    and_(CasoTesteModel.id == r.caso_id, CasoTesteModel.unidade_id == unidade_id),
                )
                .join(ProjetoModel, ProjetoModel.id == CasoTesteModel.projeto_id)
                .where(*condicoes)
            )

        total = (await self._session.execute(consulta(func.count()))).scalar_one()
        linhas = await self._session.execute(
            consulta(
                r, CasoTesteModel.tc_id, ProjetoModel.id.label("projeto_id"), ProjetoModel.nome
            )
            .order_by(r.created_at.desc(), r.id.desc())
            .limit(page_size)
            .offset((page - 1) * page_size)
        )
        itens = [
            LinhaAuditoria(
                id=linha.id,
                registro=RegistroAuditoria(
                    table_name=linha.table_name,
                    operation=linha.operation,
                    old_values=linha.old_values,
                    new_values=linha.new_values,
                    changed_fields=tuple(linha.changed_fields or ()),
                    usuario_nome=linha.usuario_nome,
                    usuario_perfil=linha.perfil_nome,
                    origem=linha.origem,
                    created_at=linha.created_at,
                ),
                acao=AcaoAuditoria(linha.acao),
                caso_teste_id=linha.caso_id,
                tc_id=linha.tc_id,
                projeto_id=linha.projeto_id,
                projeto_nome=linha.nome,
                tela=linha.tela,
            )
            for linha in linhas
        ]
        return PagedResult(itens, page, page_size, total)
