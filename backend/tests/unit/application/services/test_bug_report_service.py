from datetime import datetime
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from src.application.services.bug_report_service import BugReportServiceImpl
from src.domain.common.exceptions import ForbiddenException, InvalidInputException
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.queries.bug_report import CasoComFalhas, FalhaSdf, FiltrosBugReport
from src.domain.queries.resumo_overview import EscopoOverview

CONSULTAR = frozenset({"form_factor.consultar"})
PROJETO = uuid4()


def _caso():
    falha = FalhaSdf(uuid4(), "SM-1234", "SDF-5", "FAIL", "Crash", datetime(2026, 11, 5, 9))
    return CasoComFalhas(
        uuid4(), "Clock_000002", "InFixes", uuid4(), uuid4(), "ana.s", None, uuid4(), "bia.c",
        (falha,),
    )  # fmt: skip


@pytest.fixture
def repo():
    repo = AsyncMock()
    repo.listar_casos_com_falhas.return_value = PagedResult([_caso()], 2, 20, 21)
    return repo


@pytest.mark.asyncio
async def test_dev_recebe_o_recorte_por_pessoa(repo):
    # Spec 072, CA-18: o repositório inclui dono, backup e Dev Fix.
    dev = UsuarioAutenticado(uuid4(), uuid4(), "USUARIO_PADRAO", permissoes=CONSULTAR)
    filtros = FiltrosBugReport(projeto_id=PROJETO, dev_fix="bia")

    resposta = await BugReportServiceImpl(repo).listar(dev, filtros, 2, 20)

    repo.listar_casos_com_falhas.assert_awaited_once_with(
        dev.unidade_id, EscopoOverview(pessoa_id=dev.id), filtros, 2, 20
    )
    assert (resposta.page, resposta.total_count) == (2, 21)
    assert resposta.items[0].dev_fix_identificador == "bia.c"
    assert resposta.items[0].falhas[0].descricao == "Crash"


@pytest.mark.asyncio
async def test_dia_vira_o_intervalo_no_fuso_pedido(repo):
    # Spec 072, CA-09.
    kp = UsuarioAutenticado(uuid4(), uuid4(), "KP", permissoes=CONSULTAR, time_ids=(uuid4(),))

    await BugReportServiceImpl(repo).listar(
        kp, FiltrosBugReport(projeto_id=PROJETO), 1, 20, dia="2026-11-06", fuso_horario="UTC"
    )

    filtros = repo.listar_casos_com_falhas.call_args.args[2]
    assert (filtros.inicio, filtros.fim) == (datetime(2026, 11, 6), datetime(2026, 11, 7))


@pytest.mark.asyncio
async def test_dia_e_semana_juntos_sao_recusados(repo):
    kp = UsuarioAutenticado(uuid4(), uuid4(), "KP", permissoes=CONSULTAR, time_ids=(uuid4(),))

    with pytest.raises(InvalidInputException):
        await BugReportServiceImpl(repo).listar(
            kp, FiltrosBugReport(projeto_id=PROJETO), 1, 20, dia="2026-11-06", semana="2026-W45"
        )

    repo.listar_casos_com_falhas.assert_not_awaited()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("perfil", "permissoes"), [("KP", frozenset()), ("OUTRO", CONSULTAR), (None, CONSULTAR)]
)
async def test_sem_permissao_ou_perfil_fora_recusa(repo, perfil, permissoes):
    usuario = UsuarioAutenticado(uuid4(), uuid4(), perfil, permissoes=permissoes)

    with pytest.raises(ForbiddenException):
        await BugReportServiceImpl(repo).listar(
            usuario, FiltrosBugReport(projeto_id=PROJETO), 1, 20
        )

    repo.listar_casos_com_falhas.assert_not_awaited()


@pytest.mark.asyncio
async def test_gestao_sem_time_recebe_lista_vazia_sem_consultar(repo):
    kp = UsuarioAutenticado(uuid4(), uuid4(), "KP", permissoes=CONSULTAR)

    resposta = await BugReportServiceImpl(repo).listar(
        kp, FiltrosBugReport(projeto_id=PROJETO), 1, 20
    )

    assert (list(resposta.items), resposta.total_count) == ([], 0)
    repo.listar_casos_com_falhas.assert_not_awaited()
