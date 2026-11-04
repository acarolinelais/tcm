from datetime import datetime
from pathlib import Path
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from src.application.services.importacao_sdf_service import ImportacaoSdfServiceImpl
from src.application.validators.relatorio_sdf import RelatorioSdfInvalido
from src.domain.common.exceptions import ForbiddenException, NotFoundException
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.caso_teste import (
    CasoTeste,
    CategoriaCasoTeste,
    DificuldadeCasoTeste,
    SituacaoCasoTeste,
)
from src.domain.entities.modelo_dispositivo import ModeloDispositivo
from src.domain.entities.projeto import Projeto
from src.domain.entities.projeto_modelo import ProjetoModelo
from src.domain.entities.time import Time
from tests.unit.application.validators.test_relatorio_sdf import relatorio

EXEMPLO = Path(__file__).parents[3] / "fixtures" / "sdf" / "123456-789012_0_Test_1_Detail.xlsx"
NOME = EXEMPLO.name


class _Contexto:
    def __init__(self, one_ui="9.5"):
        (
            self.projeto_repo,
            self.time_repo,
            self.caso_repo,
            self.modelo_repo,
            self.vinculo_repo,
            self.importacoes,
            self.execucoes,
            self.resultados,
            self.uow,
            self.rodadas,
        ) = (AsyncMock() for _ in range(10))
        unidade_id, time_id, setor_id, admin_id = (uuid4() for _ in range(4))
        self.usuario = UsuarioAutenticado(admin_id, unidade_id, "ADMIN_UNIDADE")
        self.projeto = Projeto(unidade_id, time_id, "Keyboard", one_ui)
        self.modelo = ModeloDispositivo(unidade_id, "SM-S948B")
        self.projeto_repo.obter_por_id.return_value = self.projeto
        self.time_repo.obter_por_id.return_value = Time(unidade_id, setor_id, "QA", admin_id)
        self.vinculo_repo.listar_por_projeto.return_value = [
            ProjetoModelo(unidade_id, self.projeto.id, self.modelo.id)
        ]
        self.modelo_repo.listar_por_ids.return_value = [self.modelo]
        self.caso_repo.obter_por_projeto_tc_id.side_effect = lambda _u, _p, tc_id: CasoTeste(
            unidade_id,
            self.projeto.id,
            tc_id,
            CategoriaCasoTeste.A,
            DificuldadeCasoTeste.LOW,
            uuid4(),
            uuid4(),
            SituacaoCasoTeste.NEW,
        )
        self.rodadas.existe_sdf_id_no_projeto.return_value = False
        self.execucoes.existe_sdf_id_importado_no_projeto.return_value = False
        self.service = ImportacaoSdfServiceImpl(
            self.projeto_repo,
            self.time_repo,
            self.caso_repo,
            self.modelo_repo,
            self.vinculo_repo,
            self.importacoes,
            self.execucoes,
            self.resultados,
            self.uow,
            self.rodadas,
        )

    async def importar(self, nome=NOME, conteudo=None, usuario=None):
        return await self.service.importar(
            usuario or self.usuario,
            self.projeto.id,
            nome,
            EXEMPLO.read_bytes() if conteudo is None else conteudo,
        )

    def nada_gravado(self):
        self.importacoes.adicionar.assert_not_awaited()
        self.execucoes.adicionar.assert_not_awaited()
        self.resultados.adicionar.assert_not_awaited()
        self.uow.commit.assert_not_awaited()


@pytest.fixture
def ctx():
    return _Contexto()


async def recusado(ctx, **kwargs):
    with pytest.raises(RelatorioSdfInvalido) as erro:
        await ctx.importar(**kwargs)
    ctx.nada_gravado()
    return [(item.codigo, item.linha) for item in erro.value.erros]


async def test_importa_o_exemplo_real_no_device_do_c4_com_sdf_data_e_descricao(ctx):
    resposta = await ctx.importar()

    assert (resposta.quantidade_execucoes, resposta.quantidade_resultados) == (9, 9)
    execucoes = [chamada.args[0] for chamada in ctx.execucoes.adicionar.await_args_list]
    resultados = [chamada.args[0] for chamada in ctx.resultados.adicionar.await_args_list]
    assert {execucao.sdf_id for execucao in execucoes} == {"123456-789012"}
    assert {execucao.data_reportada for execucao in execucoes} == {
        datetime(2026, 10, 21, 18, 43, 35)
    }
    assert {resultado.modelo_dispositivo_id for resultado in resultados} == {ctx.modelo.id}
    assert resultados[0].descricao == "# PASS: Test case was executed successfully"
    for repo in (
        ctx.rodadas.existe_sdf_id_no_projeto,
        ctx.execucoes.existe_sdf_id_importado_no_projeto,
    ):
        repo.assert_awaited_once_with(ctx.usuario.unidade_id, ctx.projeto.id, "123456-789012")
    ctx.uow.commit.assert_awaited_once()


async def test_device_do_c4_ignora_maiusculas_e_espacos(ctx):
    conteudo = relatorio(
        [("Keyboard_000001.py", "PASS", "", "Keyboard_A_OneUI95.ts")], device=" sm-s948b "
    )

    resposta = await ctx.importar(conteudo=conteudo)

    assert resposta.quantidade_resultados == 1


@pytest.mark.parametrize("onde", ["rodada", "importacao"])
async def test_falha_sdf_id_ja_usado_em_rodada_ou_importacao(ctx, onde):
    repo = (
        ctx.rodadas.existe_sdf_id_no_projeto
        if onde == "rodada"
        else (ctx.execucoes.existe_sdf_id_importado_no_projeto)
    )
    repo.return_value = True

    assert await recusado(ctx) == [("sdf_id_repetido", None)]


async def test_falha_device_fora_do_projeto(ctx):
    conteudo = relatorio(
        [("Keyboard_000001.py", "PASS", "", "Keyboard_A_OneUI95.ts")], device="SM-X"
    )

    assert await recusado(ctx, conteudo=conteudo) == [("sdf_device_fora_do_projeto", None)]


async def test_falha_one_ui_diferente_da_do_projeto(ctx):
    conteudo = relatorio([("Keyboard_000001.py", "PASS", "", "Keyboard_A_OneUI80.ts")])

    assert await recusado(ctx, conteudo=conteudo) == [("sdf_one_ui_diferente", 8)]


@pytest.mark.parametrize(("caminho", "do_projeto"), [("OneUI10", "10.0"), ("OneUI105", "10.5")])
async def test_one_ui_10_bate_com_o_projeto_pelo_numero(caminho, do_projeto):
    ctx = _Contexto(one_ui=do_projeto)
    conteudo = relatorio([("Clock_000001.py", "PASS", "", f"Clock_A_{caminho}.ts")])

    resposta = await ctx.importar(conteudo=conteudo)

    assert resposta.quantidade_execucoes == 1


async def test_falha_tc_fora_do_projeto_recusa_o_arquivo_inteiro(ctx):
    ctx.caso_repo.obter_por_projeto_tc_id.side_effect = None
    ctx.caso_repo.obter_por_projeto_tc_id.return_value = None

    erros = await recusado(ctx)

    assert erros[0] == ("sdf_tc_fora_do_projeto", 9)
    assert len(erros) == 9


async def test_falha_f4_invalida_e_tc_desconhecido_saem_juntos(ctx):
    ctx.caso_repo.obter_por_projeto_tc_id.side_effect = None
    ctx.caso_repo.obter_por_projeto_tc_id.return_value = None
    conteudo = relatorio([("Unknown_001.py", "PASS", "", "Keyboard_A_OneUI95.ts")], data="ontem")

    assert await recusado(ctx, conteudo=conteudo) == [
        ("sdf_data_invalida", None),
        ("sdf_tc_fora_do_projeto", 8),
    ]


async def test_falha_nome_sem_sdf_id(ctx):
    assert await recusado(ctx, nome="Detail.xlsx") == [("sdf_nome_sem_id", None)]
    ctx.rodadas.existe_sdf_id_no_projeto.assert_not_awaited()


async def test_dev_nao_importa_mesmo_com_permissao_concedida(ctx):
    dev = UsuarioAutenticado(
        ctx.usuario.id,
        ctx.usuario.unidade_id,
        "USUARIO_PADRAO",
        permissoes=frozenset({"form_factor.importar"}),
    )

    with pytest.raises(ForbiddenException):
        await ctx.importar(usuario=dev)

    ctx.nada_gravado()


async def test_kp_de_outro_time_nao_ve_o_projeto(ctx):
    kp = UsuarioAutenticado(
        uuid4(),
        ctx.usuario.unidade_id,
        "KP",
        permissoes=frozenset({"form_factor.importar"}),
        time_ids=(uuid4(),),
    )

    with pytest.raises(NotFoundException):
        await ctx.importar(usuario=kp)

    ctx.nada_gravado()
