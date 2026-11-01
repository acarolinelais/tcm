from datetime import UTC, datetime
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from src.application.services.auditoria_service import AuditoriaServiceImpl
from src.domain.common.exceptions import ForbiddenException, InvalidInputException
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.queries.auditoria import AcaoAuditoria, LinhaAuditoria, OrigemAuditoria
from src.domain.queries.registro_auditoria import RegistroAuditoria

BIA = uuid4()
CARLOS = uuid4()


def _linha():
    registro = RegistroAuditoria(
        table_name="casos_teste",
        operation="UPDATE",
        old_values={"status": "InProgress", "responsavel_id": str(BIA), "updated_at": "x"},
        new_values={"status": "InReview", "responsavel_id": str(CARLOS), "updated_at": "y"},
        changed_fields=("responsavel_id", "status", "updated_at"),
        usuario_nome="Ana Souza",
        usuario_perfil="Key Person",
        origem="api",
        created_at=datetime(2026, 10, 30, 15, 42),
    )
    return LinhaAuditoria(
        id=1284,
        registro=registro,
        acao=AcaoAuditoria.ALTERACAO,
        caso_teste_id=uuid4(),
        tc_id="Clock_001",
        projeto_id=uuid4(),
        projeto_nome="Clock 9.5",
        tela="/projetos/abc/kanban",
    )


@pytest.fixture
def repos():
    auditoria, usuarios = AsyncMock(), AsyncMock()
    auditoria.listar.return_value = PagedResult([_linha()], 1, 20, 1)
    usuarios.dados_por_usuarios.return_value = {
        BIA: ("Bia Lima", None, None, None),
        CARLOS: ("Carlos Melo", None, None, None),
    }
    return auditoria, usuarios


def _usuario(perfil_codigo):
    return UsuarioAutenticado(uuid4(), uuid4(), perfil_codigo)


@pytest.mark.asyncio
async def test_registro_com_dois_campos_vira_duas_alteracoes_com_nomes_resolvidos(repos):
    auditoria, usuarios = repos
    admin = _usuario("ADMIN_UNIDADE")

    resultado = await AuditoriaServiceImpl(auditoria, usuarios).listar(
        admin,
        1,
        20,
        data_inicio="2026-10-30",
        data_fim="2026-10-30",
        fuso_horario="America/Sao_Paulo",
        usuario_ids=[BIA],
        origem=OrigemAuditoria.API,
    )

    item = resultado.items[0]
    assert [(a.campo, a.valor_anterior, a.valor_novo) for a in item.alteracoes] == [
        ("responsavel_id", "Bia Lima", "Carlos Melo"),
        ("status", "InProgress", "InReview"),
    ]
    assert (item.usuario_nome, item.acao, item.alterado_em.tzinfo) == (
        "Ana Souza",
        AcaoAuditoria.ALTERACAO,
        UTC,
    )
    unidade_id, filtros, page, page_size = auditoria.listar.call_args.args
    assert (unidade_id, page, page_size) == (admin.unidade_id, 1, 20)
    # Dia inteiro em São Paulo (UTC-3), em UTC.
    assert (filtros.inicio, filtros.fim) == (
        datetime(2026, 10, 30, 3, tzinfo=UTC),
        datetime(2026, 10, 31, 3, tzinfo=UTC),
    )
    assert (filtros.usuario_ids, filtros.origem) == ((BIA,), OrigemAuditoria.API)


@pytest.mark.asyncio
@pytest.mark.parametrize("perfil", ["GERENTE", "KP", "DEV"])
async def test_falha_quem_nao_e_admin_recebe_forbidden(repos, perfil):
    auditoria, usuarios = repos

    with pytest.raises(ForbiddenException):
        await AuditoriaServiceImpl(auditoria, usuarios).listar(_usuario(perfil), 1, 20)

    auditoria.listar.assert_not_awaited()


@pytest.mark.asyncio
async def test_falha_periodo_invertido_e_recusado_sem_consultar(repos):
    auditoria, usuarios = repos

    with pytest.raises(InvalidInputException):
        await AuditoriaServiceImpl(auditoria, usuarios).listar(
            _usuario("ADMIN_UNIDADE"), 1, 20, data_inicio="2026-10-30", data_fim="2026-10-29"
        )

    auditoria.listar.assert_not_awaited()
