from datetime import date, datetime
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from src.application.services.form_factor_service import FormFactorServiceImpl
from src.domain.common.exceptions import (
    ForbiddenException,
    InvalidInputException,
    NotFoundException,
)
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.projeto import Projeto
from src.domain.entities.time import Time
from src.domain.queries.historico_form_factor import (
    CasoHistorico,
    FiltrosCasoHistorico,
    LinhaHistoricoExecucao,
)
from src.domain.queries.modelo_do_projeto import ModeloDoProjeto

DIA = date(2026, 10, 10)


class _Contexto:
    def __init__(self) -> None:
        self.unidade_id, self.time_id = uuid4(), uuid4()
        self.projeto = Projeto(self.unidade_id, self.time_id, "Clock", "9.5")
        time = Time(self.unidade_id, uuid4(), "QA", uuid4())
        time.id = self.time_id
        self.s25, self.s26 = ModeloDoProjeto(uuid4(), "SM-S25"), ModeloDoProjeto(uuid4(), "SM-S26")
        self.caso = CasoHistorico(uuid4(), self.projeto.id, "Clock_001", uuid4(), "ANA-001")
        self.sem_execucao = CasoHistorico(uuid4(), self.projeto.id, "Clock_002", uuid4(), None)
        self.projeto_repo, self.time_repo, self.modelo_repo, self.historico = (
            AsyncMock() for _ in range(4)
        )
        self.projeto_repo.obter_por_id.return_value = self.projeto
        self.time_repo.obter_por_id.return_value = time
        self.modelo_repo.listar_modelos_do_projeto.return_value = (self.s25, self.s26)
        self.historico.listar_casos.return_value = PagedResult(
            [self.caso, self.sem_execucao], 1, 20, 2
        )
        self.historico.obter_caso.return_value = self.caso
        self.historico.listar_datas.return_value = (DIA,)
        self.historico.listar_resultados.return_value = ()
        self.historico.listar_ultimo_sdf_por_modelo.return_value = {
            self.caso.caso_teste_id: {self.s26.id: "SDF-9", self.s25.id: None}
        }
        self.service = FormFactorServiceImpl(
            self.projeto_repo,
            self.time_repo,
            AsyncMock(),
            self.modelo_repo,
            AsyncMock(),
            AsyncMock(),
            AsyncMock(),
            historico_repo=self.historico,
        )

    def usuario(self, perfil="KP", permissoes=("form_factor.consultar",), **escopo):
        escopo.setdefault("time_ids", (self.time_id,))
        return UsuarioAutenticado(
            uuid4(), self.unidade_id, perfil, permissoes=frozenset(permissoes), **escopo
        )

    def linha(self, modelo, resultado, hora, origem="SDF", sdf_id="SDF-1", dia=DIA):
        return LinhaHistoricoExecucao(
            self.caso.caso_teste_id,
            dia,
            modelo.id,
            resultado,
            uuid4(),
            sdf_id,
            origem,
            datetime(dia.year, dia.month, dia.day, hora),
        )


@pytest.fixture
def ctx():
    return _Contexto()


async def test_historico_pivota_por_data_e_modelo_e_mantem_a_execucao_mais_recente(ctx):
    importada = ctx.linha(ctx.s26, "FAIL", 9)
    manual = ctx.linha(ctx.s26, "PASS", 15, origem="MANUAL", sdf_id=None)
    outro_modelo = ctx.linha(ctx.s25, "PASS", 9)
    ctx.historico.listar_resultados.return_value = (importada, outro_modelo, manual)

    resposta = await ctx.service.historico_projeto(
        ctx.usuario(), ctx.projeto.id, fuso_horario="America/Manaus"
    )

    assert [modelo.nome for modelo in resposta.modelos] == ["SM-S25", "SM-S26"]
    assert resposta.datas == [DIA]
    linha, vazia = resposta.items
    assert linha.responsavel_identificador == "ANA-001"
    assert linha.resultados[DIA][ctx.s26.id].execucao_id == manual.execucao_id
    assert linha.resultados[DIA][ctx.s26.id].origem == "MANUAL"
    assert linha.resultados[DIA][ctx.s26.id].sdf_id is None
    assert linha.resultados[DIA][ctx.s25.id].resultado == "PASS"
    assert vazia.resultados == {}
    ctx.historico.listar_resultados.assert_awaited_once_with(
        ctx.unidade_id,
        ctx.projeto.id,
        [ctx.caso.caso_teste_id, ctx.sem_execucao.caso_teste_id],
        "America/Manaus",
        (DIA,),
    )


async def test_cada_caso_traz_o_sdf_da_ultima_execucao_de_cada_device(ctx):
    resposta = await ctx.service.historico_projeto(ctx.usuario(), ctx.projeto.id)

    # Spec 059, RN-10 e RN-11: o SDF da coluna vem da última execução do device, em qualquer data.
    com_execucao, sem_execucao = resposta.items
    assert com_execucao.ultimo_sdf_por_modelo == {ctx.s26.id: "SDF-9", ctx.s25.id: None}
    assert sem_execucao.ultimo_sdf_por_modelo == {}


async def test_historico_repassa_filtros_e_o_intervalo_do_dia_no_fuso(ctx):
    await ctx.service.historico_projeto(
        ctx.usuario(),
        ctx.projeto.id,
        tc_id="001",
        responsavel="ana",
        sdf_id="sdf",
        modelo_dispositivo_id=ctx.s25.id,
        dia="2026-10-10",
        fuso_horario="America/Manaus",
    )

    inicio, fim = datetime(2026, 10, 10, 4), datetime(2026, 10, 11, 4)
    filtros = FiltrosCasoHistorico(
        tc_id="001",
        responsavel="ana",
        sdf_id="sdf",
        modelo_dispositivo_id=ctx.s25.id,
        inicio=inicio,
        fim=fim,
    )
    ctx.historico.listar_casos.assert_awaited_once_with(
        ctx.unidade_id, ctx.projeto.id, filtros, 1, 20
    )
    # As datas usam os mesmos filtros, não os IDs da página (spec 033, RN-03).
    # No máximo 5 datas (ADR 0046).
    ctx.historico.listar_datas.assert_awaited_once_with(
        ctx.unidade_id, ctx.projeto.id, filtros, "America/Manaus", limite=5
    )


async def test_historico_pagina_os_casos_e_busca_resultados_so_da_pagina(ctx):
    ctx.historico.listar_casos.return_value = PagedResult([ctx.sem_execucao], 2, 1, 2)

    resposta = await ctx.service.historico_projeto(
        ctx.usuario(), ctx.projeto.id, page=2, page_size=1
    )

    assert [caso.tc_id for caso in resposta.items] == ["Clock_002"]
    assert (resposta.page, resposta.page_size, resposta.total_count, resposta.total_pages) == (
        2,
        1,
        2,
        2,
    )
    assert resposta.datas == [DIA]
    ctx.historico.listar_casos.assert_awaited_once_with(
        ctx.unidade_id, ctx.projeto.id, FiltrosCasoHistorico(), 2, 1
    )
    ctx.historico.listar_resultados.assert_awaited_once_with(
        ctx.unidade_id, ctx.projeto.id, [ctx.sem_execucao.caso_teste_id], "UTC", (DIA,)
    )
    ctx.historico.listar_ultimo_sdf_por_modelo.assert_awaited_once_with(
        ctx.unidade_id, ctx.projeto.id, [ctx.sem_execucao.caso_teste_id]
    )


async def test_sem_casos_nao_consulta_datas(ctx):
    ctx.historico.listar_casos.return_value = PagedResult([], 1, 20, 0)

    resposta = await ctx.service.historico_projeto(ctx.usuario(), ctx.projeto.id, tc_id="nada")

    assert (resposta.items, resposta.datas, resposta.total_count) == ([], [], 0)
    ctx.historico.listar_datas.assert_not_awaited()


async def test_pagina_alem_da_ultima_vem_vazia_com_total_e_datas(ctx):
    ctx.historico.listar_casos.return_value = PagedResult([], 5, 20, 2)

    resposta = await ctx.service.historico_projeto(ctx.usuario(), ctx.projeto.id, page=5)

    assert (resposta.items, resposta.total_count, resposta.datas) == ([], 2, [DIA])


@pytest.mark.parametrize(
    "filtros",
    [
        {"dia": "2026-10-10", "semana": "2026-W41"},
        {"dia": "10/10/2026"},
        {"semana": "2026-41"},
        {"fuso_horario": "Inexistente/Teste"},
    ],
)
async def test_periodo_ou_fuso_invalido_e_recusado_sem_consultar(ctx, filtros):
    with pytest.raises(InvalidInputException):
        await ctx.service.historico_projeto(ctx.usuario(), ctx.projeto.id, **filtros)

    ctx.historico.listar_casos.assert_not_awaited()


@pytest.mark.parametrize(
    "perfil,permissoes",
    [
        ("USUARIO_PADRAO", ()),
        ("KP", ()),
        ("ADMIN_UNIDADE", ()),
        ("PERFIL_DESCONHECIDO", ("form_factor.consultar",)),
    ],
)
async def test_historico_do_projeto_recusa_quem_nao_tem_permissao_ou_perfil(
    ctx, perfil, permissoes
):
    with pytest.raises(ForbiddenException):
        await ctx.service.historico_projeto(ctx.usuario(perfil, permissoes), ctx.projeto.id)

    ctx.historico.listar_casos.assert_not_awaited()


@pytest.mark.parametrize(
    "perfil,time_ids",
    # Spec 059, RN-01 e RN-02: o dev entra nos projetos dos times dele; o admin, em qualquer time.
    [("USUARIO_PADRAO", None), ("ADMIN_UNIDADE", ())],
)
async def test_dev_e_admin_consultam_o_historico_no_escopo_deles(ctx, perfil, time_ids):
    escopo = {} if time_ids is None else {"time_ids": time_ids}

    resposta = await ctx.service.historico_projeto(ctx.usuario(perfil, **escopo), ctx.projeto.id)

    assert len(resposta.items) == 2


async def test_dev_nao_consulta_o_historico_de_projeto_de_outro_time(ctx):
    # O KP fora do time já está em test_projeto_fora_do_escopo_ou_inativo_recebe_404...
    with pytest.raises(NotFoundException):
        await ctx.service.historico_projeto(
            ctx.usuario("USUARIO_PADRAO", time_ids=(uuid4(),)), ctx.projeto.id
        )

    ctx.historico.listar_casos.assert_not_awaited()


@pytest.mark.parametrize(
    "perfil,permissoes",
    [
        ("USUARIO_PADRAO", ()),
        ("KP", ()),
        ("ADMIN_UNIDADE", ()),
        ("PERFIL_DESCONHECIDO", ("form_factor.consultar",)),
    ],
)
async def test_execucoes_do_caso_recusam_quem_nao_tem_permissao_ou_perfil(ctx, perfil, permissoes):
    with pytest.raises(ForbiddenException):
        await ctx.service.resumo_execucoes(ctx.usuario(perfil, permissoes), ctx.caso.caso_teste_id)

    ctx.historico.obter_caso.assert_not_awaited()


async def test_dev_com_permissao_consulta_as_execucoes_de_um_caso_do_escopo(ctx):
    # Spec 058: o dev já lê os resultados do time dele, então abre o histórico dos casos dele.
    resposta = await ctx.service.resumo_execucoes(
        ctx.usuario("USUARIO_PADRAO"), ctx.caso.caso_teste_id
    )

    assert resposta.tc_id == "Clock_001"
    ctx.historico.listar_resultados.assert_awaited_once()


async def test_dev_nao_abre_as_execucoes_de_caso_de_projeto_de_outro_time(ctx):
    fora = ctx.usuario("USUARIO_PADRAO", time_ids=(uuid4(),))

    with pytest.raises(NotFoundException):
        await ctx.service.resumo_execucoes(fora, ctx.caso.caso_teste_id)

    ctx.historico.listar_resultados.assert_not_awaited()


async def test_projeto_fora_do_escopo_ou_inativo_recebe_404_e_gerente_membro_ve(ctx):
    gerente_membro = ctx.usuario("GERENTE", setores_gerenciados=(uuid4(),))
    fora = ctx.usuario(time_ids=(uuid4(),))

    resposta = await ctx.service.historico_projeto(gerente_membro, ctx.projeto.id)
    with pytest.raises(NotFoundException):
        await ctx.service.historico_projeto(fora, ctx.projeto.id)
    ctx.projeto.desativar()
    with pytest.raises(NotFoundException):
        await ctx.service.historico_projeto(ctx.usuario(), ctx.projeto.id)

    assert len(resposta.items) == 2
    ctx.historico.listar_casos.assert_awaited_once()


async def test_resumo_traz_todas_as_datas_em_ordem_cronologica_e_as_execucoes_do_mesmo_dia(ctx):
    anterior = ctx.linha(ctx.s25, "PASS", 9, dia=date(2026, 10, 2))
    importada = ctx.linha(ctx.s26, "FAIL", 9)
    manual = ctx.linha(ctx.s26, "PASS", 15, origem="MANUAL", sdf_id=None)
    ctx.historico.listar_resultados.return_value = (anterior, importada, manual)

    resposta = await ctx.service.resumo_execucoes(
        ctx.usuario(), ctx.caso.caso_teste_id, "America/Manaus"
    )

    assert resposta.tc_id == "Clock_001"
    assert resposta.responsavel_identificador == "ANA-001"
    assert [modelo.id for modelo in resposta.modelos] == [ctx.s25.id, ctx.s26.id]
    assert resposta.datas == [date(2026, 10, 2), DIA]
    celula = resposta.resultados[DIA][ctx.s26.id]
    assert [(execucao.resultado, execucao.origem) for execucao in celula] == [
        ("FAIL", "SDF"),
        ("PASS", "MANUAL"),
    ]
    assert celula[1].data_reportada == datetime(2026, 10, 10, 15)
    ctx.historico.listar_resultados.assert_awaited_once_with(
        ctx.unidade_id, ctx.projeto.id, [ctx.caso.caso_teste_id], "America/Manaus"
    )


async def test_resumo_de_caso_inexistente_ou_de_projeto_fora_do_escopo_recebe_404(ctx):
    with pytest.raises(NotFoundException):
        await ctx.service.resumo_execucoes(ctx.usuario(time_ids=(uuid4(),)), ctx.caso.caso_teste_id)
    ctx.historico.obter_caso.return_value = None
    with pytest.raises(NotFoundException):
        await ctx.service.resumo_execucoes(ctx.usuario(), uuid4())

    ctx.historico.listar_resultados.assert_not_awaited()
