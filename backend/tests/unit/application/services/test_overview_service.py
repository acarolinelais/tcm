from datetime import UTC, datetime
from unittest.mock import AsyncMock
from uuid import uuid4
from zoneinfo import ZoneInfo

import pytest
from src.application.services.overview_service import OverviewServiceImpl
from src.domain.common.exceptions import InvalidInputException
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.queries.resumo_overview import EscopoOverview, ResumoOverview

AGORA = datetime(2026, 2, 10, 12, tzinfo=UTC)


@pytest.fixture
def repo():
    repo = AsyncMock()
    repo.resumir.return_value = ResumoOverview(10, 4, 3, 3, 2, {"2025-12": 2, "2026-02": 1})
    return repo


def _service(repo):
    return OverviewServiceImpl(repo, agora=lambda: AGORA)


def _usuario(perfil, **kwargs):
    return UsuarioAutenticado(uuid4(), uuid4(), perfil, **kwargs)


@pytest.mark.asyncio
async def test_obter_devolve_contagens_e_seis_meses_do_mais_antigo_ao_atual(repo):
    resposta = await _service(repo).obter(_usuario("ADMIN_UNIDADE"), "UTC")

    assert (resposta.total, resposta.concluidos, resposta.em_andamento) == (10, 4, 3)
    assert (resposta.a_fazer, resposta.atribuidos) == (3, 2)
    assert [(p.mes, p.concluidos) for p in resposta.desempenho] == [
        ("2025-09", 0),
        ("2025-10", 0),
        ("2025-11", 0),
        ("2025-12", 2),
        ("2026-01", 0),
        ("2026-02", 1),
    ]
    desde = repo.resumir.call_args.args[3]
    assert desde == datetime(2025, 9, 1, tzinfo=UTC)


@pytest.mark.asyncio
async def test_obter_conta_os_meses_no_fuso_pedido(repo):
    service = OverviewServiceImpl(repo, agora=lambda: datetime(2026, 3, 1, 2, tzinfo=UTC))

    resposta = await service.obter(_usuario("ADMIN_UNIDADE"), "America/Sao_Paulo")

    # 1º de março às 2h UTC ainda é fevereiro em São Paulo.
    assert resposta.desempenho[-1].mes == "2026-02"
    fuso = ZoneInfo("America/Sao_Paulo")
    desde_esperado = datetime(2025, 9, 1, tzinfo=fuso)
    assert repo.resumir.call_args.args[3:] == (desde_esperado, "America/Sao_Paulo")


@pytest.mark.asyncio
async def test_obter_monta_o_escopo_de_cada_perfil(repo):
    time_a, time_b, time_c = uuid4(), uuid4(), uuid4()
    gerente = _usuario("GERENTE", time_ids=(time_a,), times_gerenciados=(time_b,))
    kp = _usuario("KP", time_ids=(time_c,))
    dev = _usuario("USUARIO_PADRAO", time_ids=(time_c,))
    service = _service(repo)

    escopos = []
    for usuario in (_usuario("ADMIN_UNIDADE"), gerente, kp, dev):
        await service.obter(usuario, "UTC")
        escopos.append(repo.resumir.call_args.args[1])

    assert escopos == [
        EscopoOverview(),
        EscopoOverview(time_ids=(time_b, time_a)),
        EscopoOverview(time_ids=(time_c,)),
        EscopoOverview(pessoa_id=dev.id),
    ]


@pytest.mark.asyncio
async def test_falha_kp_sem_time_devolve_zerado_sem_consultar(repo):
    resposta = await _service(repo).obter(_usuario("KP"), "UTC")

    assert resposta.total == 0
    assert [p.concluidos for p in resposta.desempenho] == [0] * 6
    repo.resumir.assert_not_called()


@pytest.mark.asyncio
async def test_falha_fuso_invalido(repo):
    with pytest.raises(InvalidInputException):
        await _service(repo).obter(_usuario("ADMIN_UNIDADE"), "Lua/Crateras")

    repo.resumir.assert_not_called()
