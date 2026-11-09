from datetime import datetime
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from src.application.services.bug_report_service import BugReportServiceImpl
from src.domain.common.exceptions import ForbiddenException
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.queries.bug_report import FalhaAberta, FiltrosBugReport
from src.domain.queries.resumo_overview import EscopoOverview

CONSULTAR = frozenset({"form_factor.consultar"})


def _falha():
    return FalhaAberta(
        uuid4(), "Clock_000002", "Girar a tela", "InFixes", uuid4(), "Clock 9.5", uuid4(),
        uuid4(), "SM-1234", "SDF-5", "Crash ao girar a tela", datetime(2026, 11, 5, 9),
        uuid4(), "ana.s", None,
    )  # fmt: skip


@pytest.fixture
def repo():
    repo = AsyncMock()
    repo.listar_falhas_abertas.return_value = PagedResult([_falha()], 2, 20, 21)
    return repo


@pytest.mark.asyncio
async def test_dev_recebe_so_os_casos_em_que_e_dono_ou_backup(repo):
    # CA-10: o recorte por pessoa vai para a consulta.
    dev = UsuarioAutenticado(uuid4(), uuid4(), "USUARIO_PADRAO", permissoes=CONSULTAR)
    filtros = FiltrosBugReport(responsavel="ana")

    resposta = await BugReportServiceImpl(repo).listar(dev, filtros, 2, 20)

    repo.listar_falhas_abertas.assert_awaited_once_with(
        dev.unidade_id, EscopoOverview(pessoa_id=dev.id), filtros, 2, 20
    )
    assert (resposta.page, resposta.total_count) == (2, 21)
    assert resposta.items[0].motivo == "Crash ao girar a tela"


@pytest.mark.asyncio
async def test_kp_recebe_os_times_do_escopo(repo):
    time_id = uuid4()
    kp = UsuarioAutenticado(uuid4(), uuid4(), "KP", permissoes=CONSULTAR, time_ids=(time_id,))

    await BugReportServiceImpl(repo).listar(kp, FiltrosBugReport(), 1, 20)

    assert repo.listar_falhas_abertas.call_args.args[1] == EscopoOverview(time_ids=(time_id,))


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("perfil", "permissoes"), [("KP", frozenset()), ("OUTRO", CONSULTAR), (None, CONSULTAR)]
)
async def test_sem_permissao_ou_perfil_fora_recusa(repo, perfil, permissoes):
    usuario = UsuarioAutenticado(uuid4(), uuid4(), perfil, permissoes=permissoes)

    with pytest.raises(ForbiddenException):
        await BugReportServiceImpl(repo).listar(usuario, FiltrosBugReport(), 1, 20)

    repo.listar_falhas_abertas.assert_not_awaited()


@pytest.mark.asyncio
async def test_gestao_sem_time_recebe_lista_vazia_sem_consultar(repo):
    kp = UsuarioAutenticado(uuid4(), uuid4(), "KP", permissoes=CONSULTAR)

    resposta = await BugReportServiceImpl(repo).listar(kp, FiltrosBugReport(), 1, 20)

    assert (list(resposta.items), resposta.total_count) == ([], 0)
    repo.listar_falhas_abertas.assert_not_awaited()
