from datetime import datetime
from pathlib import Path
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from src.application.services.importacao_sdf_service import ImportacaoSdfServiceImpl
from src.application.validators.relatorio_sdf import RelatorioSdfInvalido
from src.domain.common.exceptions import (
    ConflictException,
    ForbiddenException,
    NotFoundException,
)
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.caso_teste import (
    CasoTeste,
    CategoriaCasoTeste,
    DificuldadeCasoTeste,
    SituacaoCasoTeste,
    StatusCasoTeste,
)
from src.domain.entities.execucao_sdf import ExecucaoSdf
from src.domain.entities.importacao_sdf import ImportacaoSdf
from src.domain.entities.importacao_sdf_status import ImportacaoSdfStatus
from src.domain.entities.modelo_dispositivo import ModeloDispositivo
from src.domain.entities.projeto import Projeto
from src.domain.entities.projeto_modelo import ProjetoModelo
from src.domain.entities.time import Time
from src.domain.queries.ultima_importacao_sdf import UltimaImportacaoSdf
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
            self.status_repo,
            self.contexto,
        ) = (AsyncMock() for _ in range(12))
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
        # Status de cada TC (To-Do por padrão) e os casos devolvidos, para o teste conferir depois.
        self.status_por_tc: dict[str, StatusCasoTeste] = {}
        self.casos: dict[str, CasoTeste] = {}

        def caso(_u, _p, tc_id):
            self.casos[tc_id] = CasoTeste(
                unidade_id,
                self.projeto.id,
                tc_id,
                CategoriaCasoTeste.A,
                DificuldadeCasoTeste.LOW,
                uuid4(),
                uuid4(),
                SituacaoCasoTeste.NEW,
                self.status_por_tc.get(tc_id, StatusCasoTeste.TO_DO),
            )
            return self.casos[tc_id]

        self.caso_repo.obter_por_projeto_tc_id.side_effect = caso
        self.rodadas.existe_sdf_id_no_projeto.return_value = False
        self.execucoes.existe_sdf_id_importado_no_projeto.return_value = False
        self.caso_repo.listar_todos_aprovados.return_value = set()
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
            self.status_repo,
            self.contexto,
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


async def test_importacao_confere_a_finalizacao_de_tudo_dos_casos_do_relatorio(ctx):
    # Spec 065, RN-06: na mesma transação, antes do commit.
    ordem = []
    ctx.caso_repo.marcar_todos_aprovados.side_effect = lambda *_: ordem.append("marcar")
    ctx.uow.commit.side_effect = lambda: ordem.append("commit")

    await ctx.importar()

    unidade_id, projeto_id, caso_ids = ctx.caso_repo.marcar_todos_aprovados.await_args.args
    execucoes = [chamada.args[0] for chamada in ctx.execucoes.adicionar.await_args_list]
    assert (unidade_id, projeto_id) == (ctx.usuario.unidade_id, ctx.projeto.id)
    assert set(caso_ids) == {execucao.caso_teste_id for execucao in execucoes}
    assert ordem == ["marcar", "commit"]


async def test_relatorio_recusado_nao_confere_a_finalizacao_de_tudo(ctx):
    # Spec 065, CA-13: nenhum resultado entrou, nenhuma data é gravada.
    conteudo = relatorio(
        [("Keyboard_000001.py", "PASS", "", "Keyboard_A_OneUI95.ts")], device="SM-X"
    )

    await recusado(ctx, conteudo=conteudo)

    ctx.caso_repo.marcar_todos_aprovados.assert_not_awaited()


async def test_cada_caso_do_relatorio_segue_a_sua_regra_de_status(ctx):
    # Spec 066, CA-07: tudo PASS, FAIL em In Validation e FAIL fora de In Validation juntos.
    ctx.status_por_tc.update(
        {
            "Keyboard_000001": StatusCasoTeste.IN_VALIDATION,
            "Keyboard_000002": StatusCasoTeste.IN_VALIDATION,
            "Keyboard_000003": StatusCasoTeste.IN_PROGRESS,
            "Keyboard_000004": StatusCasoTeste.IN_VALIDATION,
        }
    )
    casos = ctx.casos
    ctx.caso_repo.listar_todos_aprovados.side_effect = lambda *_: {casos["Keyboard_000001"].id}
    ordem = []
    ctx.contexto.definir_origem.side_effect = lambda _: ordem.append("origem")
    ctx.caso_repo.atualizar.side_effect = lambda caso: ordem.append(caso.tc_id)
    ctx.caso_repo.marcar_todos_aprovados.side_effect = lambda *_: ordem.append("marcar")
    ctx.uow.commit.side_effect = lambda: ordem.append("commit")
    conteudo = relatorio(
        [
            ("Keyboard_000001.py", "PASS", "", "Keyboard_A_OneUI95.ts"),
            # Maiúsculas e espaços não importam (RN-03): este FAIL é o que leva a In Fixes.
            ("Keyboard_000002.py", " Fail ", "", "Keyboard_A_OneUI95.ts"),
            ("Keyboard_000003.py", "FAIL", "", "Keyboard_A_OneUI95.ts"),
            ("Keyboard_000004.py", "N/A", "", "Keyboard_A_OneUI95.ts"),
        ]
    )

    await ctx.importar(conteudo=conteudo)

    assert {tc_id: caso.status for tc_id, caso in casos.items()} == {
        "Keyboard_000001": StatusCasoTeste.DONE,
        "Keyboard_000002": StatusCasoTeste.IN_FIXES,
        # RN-05: fora de In Validation o FAIL só vai para o histórico.
        "Keyboard_000003": StatusCasoTeste.IN_PROGRESS,
        "Keyboard_000004": StatusCasoTeste.IN_VALIDATION,
    }
    # Só os que mudaram são gravados, com a origem Form Factor, antes do UPDATE da End date.
    assert ordem == ["origem", "Keyboard_000001", "Keyboard_000002", "marcar", "commit"]
    ctx.contexto.definir_origem.assert_awaited_once_with("form_factor")
    # Spec 067: o Status aplicado fica guardado para desfazer.
    guardados = [chamada.args[0] for chamada in ctx.status_repo.adicionar.await_args_list]
    assert [(g.caso_teste_id, g.status_aplicado) for g in guardados] == [
        (casos["Keyboard_000001"].id, StatusCasoTeste.DONE),
        (casos["Keyboard_000002"].id, StatusCasoTeste.IN_FIXES),
    ]


async def test_exception_e_none_levam_in_validation_para_in_fixes(ctx):
    # Spec 072, CA-06: toda falha conta, não só FAIL. N/A e Check não são falha.
    for tc_id in ("Keyboard_000001", "Keyboard_000002", "Keyboard_000003"):
        ctx.status_por_tc[tc_id] = StatusCasoTeste.IN_VALIDATION
    conteudo = relatorio(
        [
            ("Keyboard_000001.py", "EXCEPTION", "", "Keyboard_A_OneUI95.ts"),
            ("Keyboard_000002.py", "None", "", "Keyboard_A_OneUI95.ts"),
            ("Keyboard_000003.py", "Check", "", "Keyboard_A_OneUI95.ts"),
        ]
    )

    await ctx.importar(conteudo=conteudo)

    assert {tc_id: caso.status for tc_id, caso in ctx.casos.items()} == {
        "Keyboard_000001": StatusCasoTeste.IN_FIXES,
        "Keyboard_000002": StatusCasoTeste.IN_FIXES,
        "Keyboard_000003": StatusCasoTeste.IN_VALIDATION,
    }


async def test_execucao_grava_a_tentativa_de_correcao_que_o_resultado_produz(ctx):
    # Spec 073: a falha em validação abre a tentativa; fora da validação fica na tentativa atual.
    ctx.status_por_tc["Keyboard_000001"] = StatusCasoTeste.IN_VALIDATION
    ctx.status_por_tc["Keyboard_000002"] = StatusCasoTeste.IN_PROGRESS
    conteudo = relatorio(
        [
            ("Keyboard_000001.py", "FAIL", "", "Keyboard_A_OneUI95.ts"),
            ("Keyboard_000002.py", "FAIL", "", "Keyboard_A_OneUI95.ts"),
            ("Keyboard_000003.py", "PASS", "", "Keyboard_A_OneUI95.ts"),
        ]
    )

    await ctx.importar(conteudo=conteudo)

    execucoes = [
        chamada.args[0] for chamada in ctx.execucoes.definir_tentativa_correcao.await_args_list
    ]
    por_caso = {ctx.casos[tc].id: tc for tc in ctx.casos}
    assert {por_caso[e.caso_teste_id]: e.tentativa_correcao for e in execucoes} == {
        "Keyboard_000001": 1,
        "Keyboard_000002": 0,
        "Keyboard_000003": 0,
    }
    assert ctx.casos["Keyboard_000001"].tentativa_correcao == 1


@pytest.mark.parametrize("voltou_a_validar", [True, False])
async def test_done_com_dev_fix_marca_a_correcao_se_voltou_a_validar(ctx, voltou_a_validar):
    # Spec 072, RN-08: CA-15 (voltou depois do Dev Fix) e CA-17 (já estava em validação).
    ctx.status_por_tc["Keyboard_000001"] = StatusCasoTeste.IN_VALIDATION
    casos = ctx.casos
    ctx.caso_repo.listar_todos_aprovados.side_effect = lambda *_: {casos["Keyboard_000001"].id}
    ctx.caso_repo.obter_por_projeto_tc_id.side_effect = _com_dev_fix(ctx)
    ctx.status_repo.entraram_em_validacao_depois_do_dev_fix.side_effect = lambda _, ids: (
        set(ids) if voltou_a_validar else set()
    )
    conteudo = relatorio([("Keyboard_000001.py", "PASS", "", "Keyboard_A_OneUI95.ts")])

    await ctx.importar(conteudo=conteudo)

    caso = casos["Keyboard_000001"]
    ctx.status_repo.entraram_em_validacao_depois_do_dev_fix.assert_awaited_once_with(
        ctx.usuario.unidade_id, [caso.id]
    )
    guardado = ctx.status_repo.adicionar.await_args.args[0]
    assert (guardado.status_aplicado, guardado.concluiu_correcao) == (
        StatusCasoTeste.DONE,
        voltou_a_validar,
    )


async def test_done_sem_dev_fix_nao_consulta_a_correcao(ctx):
    # Spec 072, CA-16 (falha): sem Dev Fix não há correção para encerrar.
    ctx.status_por_tc["Keyboard_000001"] = StatusCasoTeste.IN_VALIDATION
    casos = ctx.casos
    ctx.caso_repo.listar_todos_aprovados.side_effect = lambda *_: {casos["Keyboard_000001"].id}
    conteudo = relatorio([("Keyboard_000001.py", "PASS", "", "Keyboard_A_OneUI95.ts")])

    await ctx.importar(conteudo=conteudo)

    ctx.status_repo.entraram_em_validacao_depois_do_dev_fix.assert_not_awaited()
    assert ctx.status_repo.adicionar.await_args.args[0].concluiu_correcao is False


def _com_dev_fix(ctx):
    criar = ctx.caso_repo.obter_por_projeto_tc_id.side_effect

    def caso(*args):
        novo = criar(*args)
        novo.definir_dev_fix(uuid4())
        return novo

    return caso


async def test_relatorio_recusado_nao_muda_status(ctx):
    # Spec 066, CA-11 (falha).
    conteudo = relatorio(
        [("Keyboard_000001.py", "PASS", "", "Keyboard_A_OneUI95.ts")], device="SM-X"
    )

    await recusado(ctx, conteudo=conteudo)

    ctx.caso_repo.listar_todos_aprovados.assert_not_awaited()
    ctx.caso_repo.atualizar.assert_not_awaited()


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


def _importacao_para_desfazer(ctx, *casos):
    importacao = ImportacaoSdf(ctx.usuario.unidade_id, ctx.projeto.id, ctx.usuario.id)
    importacao.created_at = datetime(2026, 11, 7, 10)
    ctx.importacoes.obter_por_id.return_value = importacao
    ctx.importacoes.obter_ultima_ativa.return_value = UltimaImportacaoSdf(
        importacao.id, "SDF-1", "SM-S948B", datetime(2026, 11, 6), "Ana", importacao.created_at
    )
    ctx.execucoes.listar_por_importacao.return_value = [
        ExecucaoSdf(
            ctx.usuario.unidade_id, importacao.id, caso.id, "SDF-1", datetime(2026, 11, 6), "9.5"
        )
        for caso in casos
    ]
    return importacao


def _caso(ctx, status):
    return CasoTeste(
        ctx.usuario.unidade_id,
        ctx.projeto.id,
        f"Keyboard_{uuid4().hex[:6]}",
        CategoriaCasoTeste.A,
        DificuldadeCasoTeste.LOW,
        uuid4(),
        uuid4(),
        SituacaoCasoTeste.NEW,
        status,
    )


async def test_desfazer_volta_o_status_e_recalcula_a_end_date_num_commit(ctx):
    # Spec 067, CA-01, CA-02 e CA-04.
    em_fixes = _caso(ctx, StatusCasoTeste.IN_FIXES)
    so_resultado = _caso(ctx, StatusCasoTeste.IN_PROGRESS)
    importacao = _importacao_para_desfazer(ctx, em_fixes, so_resultado)
    ctx.status_repo.listar_revertiveis.return_value = (
        ImportacaoSdfStatus(
            ctx.usuario.unidade_id, importacao.id, em_fixes.id, StatusCasoTeste.IN_FIXES
        ),
    )
    ctx.caso_repo.obter_por_id.return_value = em_fixes
    ordem = []
    ctx.contexto.definir_origem.side_effect = lambda origem: ordem.append(origem)
    ctx.caso_repo.atualizar.side_effect = lambda _: ordem.append("caso")
    ctx.caso_repo.limpar_todos_aprovados.side_effect = lambda *_: ordem.append("limpar")
    ctx.caso_repo.marcar_todos_aprovados.side_effect = lambda *_: ordem.append("marcar")
    ctx.uow.commit.side_effect = lambda: ordem.append("commit")

    resposta = await ctx.service.desfazer(ctx.usuario, ctx.projeto.id, importacao.id)

    assert resposta.casos_revertidos == 1
    assert em_fixes.status is StatusCasoTeste.IN_VALIDATION
    assert (importacao.ativo, importacao.desfeita_por) == (False, ctx.usuario.id)
    ctx.importacoes.atualizar.assert_awaited_once_with(importacao)
    assert ordem == ["importacao_sdf_desfeita", "caso", "limpar", "marcar", "commit"]
    ctx.status_repo.listar_revertiveis.assert_awaited_once_with(
        ctx.usuario.unidade_id, importacao.id, importacao.created_at
    )
    assert set(ctx.caso_repo.limpar_todos_aprovados.await_args.args[1]) == {
        em_fixes.id,
        so_resultado.id,
    }


async def test_falha_desfazer_quando_outra_importacao_entrou_no_meio(ctx):
    # CA-10: o diálogo mostrou a A, mas a B já é a última.
    importacao = _importacao_para_desfazer(ctx)
    ctx.importacoes.obter_ultima_ativa.return_value = UltimaImportacaoSdf(
        uuid4(), "SDF-2", "SM-S948B", datetime(2026, 11, 7), "Bia", datetime(2026, 11, 7, 11)
    )

    with pytest.raises(ConflictException):
        await ctx.service.desfazer(ctx.usuario, ctx.projeto.id, importacao.id)

    ctx.importacoes.atualizar.assert_not_awaited()
    ctx.uow.commit.assert_not_awaited()


@pytest.mark.parametrize("situacao", ["inexistente", "desfeita", "outro_projeto"])
async def test_falha_desfazer_importacao_que_nao_existe_no_projeto(ctx, situacao):
    # CA-09.
    importacao = _importacao_para_desfazer(ctx)
    if situacao == "inexistente":
        ctx.importacoes.obter_por_id.return_value = None
    elif situacao == "desfeita":
        importacao.desfazer(uuid4())
    else:
        importacao.projeto_id = uuid4()

    with pytest.raises(NotFoundException):
        await ctx.service.desfazer(ctx.usuario, ctx.projeto.id, importacao.id)

    ctx.uow.commit.assert_not_awaited()


async def test_falha_dev_nao_desfaz_nem_ve_a_ultima(ctx):
    # CA-08.
    dev = UsuarioAutenticado(
        uuid4(),
        ctx.usuario.unidade_id,
        "USUARIO_PADRAO",
        permissoes=frozenset({"form_factor.importar"}),
    )

    with pytest.raises(ForbiddenException):
        await ctx.service.desfazer(dev, ctx.projeto.id, uuid4())
    with pytest.raises(ForbiddenException):
        await ctx.service.obter_ultima(dev, ctx.projeto.id)
    ctx.uow.commit.assert_not_awaited()


async def test_falha_kp_de_outro_time_nao_desfaz(ctx):
    # CA-11.
    kp = UsuarioAutenticado(
        uuid4(),
        ctx.usuario.unidade_id,
        "KP",
        permissoes=frozenset({"form_factor.importar"}),
        time_ids=(uuid4(),),
    )

    with pytest.raises(NotFoundException):
        await ctx.service.desfazer(kp, ctx.projeto.id, uuid4())
    ctx.uow.commit.assert_not_awaited()


async def test_obter_ultima_devolve_o_que_o_dialogo_mostra_ou_nada(ctx):
    importacao = _importacao_para_desfazer(ctx)

    ultima = await ctx.service.obter_ultima(ctx.usuario, ctx.projeto.id)
    ctx.importacoes.obter_ultima_ativa.return_value = None

    assert (ultima.id, ultima.sdf_id, ultima.device) == (importacao.id, "SDF-1", "SM-S948B")
    assert await ctx.service.obter_ultima(ctx.usuario, ctx.projeto.id) is None
