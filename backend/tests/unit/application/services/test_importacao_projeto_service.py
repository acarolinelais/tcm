from datetime import UTC, date, datetime
from io import BytesIO
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from openpyxl import Workbook
from src.application.schemas.importacao_projeto import ImportarProjetoPlanilhaRequest
from src.application.services.importacao_projeto_service import ImportacaoProjetoServiceImpl
from src.application.validators.importacao_projeto import PlanilhaProjetoInvalida
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.caso_teste import (
    NivelAutomacaoCasoTeste,
    SituacaoCasoTeste,
    StatusCasoTeste,
)
from src.domain.entities.time import Time
from src.domain.entities.time_membro import TimeMembro
from src.domain.entities.usuario import Usuario


def criar_arquivo(*linhas, category="A", niveis=None, textos=None, planejada=None):
    """`niveis` acrescenta a coluna Automation Level, com um valor por linha; `textos` acrescenta
    colunas de texto (spec 028), como {cabeçalho: [valor por linha]}; `planejada`, a coluna
    Planned date (spec 075) com o mesmo valor em todas as linhas."""
    textos = textos or {}
    workbook = Workbook()
    worksheet = workbook.active
    cabecalho = ["App", "TC ID", "Difficulty", "Category", "TC Situation", "One UI"]
    cabecalho += ["Assignees", "Backup"]
    if niveis is not None:
        cabecalho.append("Automation Level")
    cabecalho += list(textos)
    if planejada is not None:
        cabecalho.append("Planned date")
    worksheet.append(cabecalho)
    for indice, (tc_id, responsavel, backup) in enumerate(
        linhas or [("Clock_001", "dev@example.com", "backup@example.com")]
    ):
        linha = ["Clock", tc_id, "Low", category, "New Step", "9.5", responsavel, backup]
        if niveis is not None:
            linha.append(niveis[indice])
        linha += [valores[indice] for valores in textos.values()]
        if planejada is not None:
            linha.append(planejada)
        worksheet.append(linha)
    arquivo = BytesIO()
    workbook.save(arquivo)
    return arquivo.getvalue()


@pytest.fixture
def contexto():
    repos = [AsyncMock() for _ in range(8)]
    (
        projeto_repo,
        caso_repo,
        time_repo,
        membro_repo,
        usuario_repo,
        modelo_repo,
        vinculo_repo,
        uow,
    ) = repos
    unidade_id, time_id, setor_id, admin_id = (uuid4() for _ in range(4))
    admin = UsuarioAutenticado(admin_id, unidade_id, "ADMIN_UNIDADE")
    time = Time(unidade_id, setor_id, "Time QA", admin_id)
    time.id = time_id
    time_repo.obter_por_id.return_value = time
    projeto_repo.obter_por_id.return_value = None
    caso_repo.existe_tc_id.return_value = False
    dev = Usuario(unidade_id, "dev", "dev@example.com", user_id="DEV-001")
    backup = Usuario(unidade_id, "backup", "backup@example.com", user_id="BACK-001")
    homonimo_a = Usuario(unidade_id, "Ana", "ana.a@example.com")
    homonimo_b = Usuario(unidade_id, "Ana", "ana.b@example.com")
    externo = Usuario(unidade_id, "externo", "externo@example.com")
    usuario_repo.listar_ativos_da_unidade.return_value = [
        dev,
        backup,
        homonimo_a,
        homonimo_b,
        externo,
    ]
    homonimo_c = Usuario(unidade_id, "Bia", "bia.time@example.com")
    homonimo_d = Usuario(unidade_id, "Bia", "bia.fora@example.com")
    usuario_repo.listar_ativos_da_unidade.return_value += [homonimo_c, homonimo_d]
    membro_repo.listar_por_time.return_value = [
        TimeMembro(unidade_id, time_id, usuario.id)
        for usuario in (dev, backup, homonimo_a, homonimo_b, homonimo_c)
    ]
    service = ImportacaoProjetoServiceImpl(
        projeto_repo,
        caso_repo,
        time_repo,
        membro_repo,
        usuario_repo,
        modelo_repo,
        vinculo_repo,
        uow,
        agora=lambda: datetime(2026, 11, 11, 15, tzinfo=UTC),
    )
    request = ImportarProjetoPlanilhaRequest(time_id=time_id)
    return service, admin, request, projeto_repo, caso_repo, uow


async def test_importa_projeto_e_test_cases_em_uma_transacao(contexto):
    service, admin, request, projetos, casos, uow = contexto

    resposta = await service.importar(admin, request, criar_arquivo())

    assert resposta.projeto.nome == "Clock 9.5"
    assert resposta.quantidade_casos == 1
    caso = casos.adicionar.call_args.args[0]
    assert caso.situation is SituacaoCasoTeste.NEW_STEP
    assert caso.status is StatusCasoTeste.TO_DO
    projetos.adicionar.assert_awaited_once()
    service._membro_repo.listar_por_time.assert_awaited_once()
    uow.commit.assert_awaited_once()


async def test_planilha_invalida_nao_persiste_dados(contexto):
    service, admin, request, projetos, casos, uow = contexto

    with pytest.raises(PlanilhaProjetoInvalida):
        await service.importar(admin, request, b"arquivo invalido")

    projetos.adicionar.assert_not_awaited()
    casos.adicionar.assert_not_awaited()
    uow.commit.assert_not_awaited()


async def test_problemas_de_pessoas_de_todas_as_linhas_sao_coletados(contexto):
    service, admin, request, projetos, casos, uow = contexto
    arquivo = criar_arquivo(
        ("Clock_001", "ninguem@example.com", "backup@example.com"),
        ("Clock_002", "Ana", "backup@example.com"),
        ("Clock_003", "dev@example.com", "externo@example.com"),
        ("Clock_004", "dev@example.com", "DEV@example.com"),
        ("Clock_005", "dev@example.com", "backup@example.com"),
    )

    with pytest.raises(PlanilhaProjetoInvalida) as erro:
        await service.importar(admin, request, arquivo)

    assert [(e.linha, e.coluna, e.codigo, e.valor) for e in erro.value.erros] == [
        (2, "Assignees", "pessoa_nao_encontrada", "ninguem@example.com"),
        (3, "Assignees", "pessoa_ambigua", "Ana"),
        (4, "Backup", "pessoa_fora_do_time", "externo@example.com"),
        (5, "Backup", "responsavel_igual_backup", "DEV@example.com"),
    ]
    assert erro.value.total_linhas == 5
    projetos.adicionar.assert_not_awaited()
    casos.adicionar.assert_not_awaited()
    uow.commit.assert_not_awaited()


async def test_problemas_de_celula_e_de_pessoa_voltam_juntos_na_mesma_linha(contexto):
    service, admin, request, projetos, casos, uow = contexto
    arquivo = criar_arquivo(
        ("Clock_001", "externo@example.com", "backup@example.com"),
        ("Clock_002", "dev@example.com", "backup@example.com"),
        category="D",
    )

    with pytest.raises(PlanilhaProjetoInvalida) as erro:
        await service.importar(admin, request, arquivo)

    assert [(e.linha, e.coluna, e.codigo) for e in erro.value.erros] == [
        (2, "Category", "valor_invalido"),
        (2, "Assignees", "pessoa_fora_do_time"),
        (3, "Category", "valor_invalido"),
    ]
    projetos.adicionar.assert_not_awaited()
    uow.commit.assert_not_awaited()


async def test_homonimo_entre_membro_e_pessoa_de_fora_do_time_e_ambiguo(contexto):
    service, admin, request, projetos, casos, uow = contexto

    with pytest.raises(PlanilhaProjetoInvalida) as erro:
        await service.importar(
            admin, request, criar_arquivo(("Clock_001", "Bia", "backup@example.com"))
        )

    assert [(item.codigo, item.valor) for item in erro.value.erros] == [("pessoa_ambigua", "Bia")]
    projetos.adicionar.assert_not_awaited()
    casos.adicionar.assert_not_awaited()
    uow.commit.assert_not_awaited()


async def test_importa_responsavel_e_backup_por_user_id(contexto):
    service, admin, request, projetos, casos, uow = contexto

    resposta = await service.importar(
        admin, request, criar_arquivo(("Clock_001", "dev-001", "BACK-001"))
    )

    assert resposta.quantidade_casos == 1
    caso = casos.adicionar.call_args.args[0]
    assert caso.responsavel_id == service._usuario_repo.listar_ativos_da_unidade.return_value[0].id
    assert caso.backup_id == service._usuario_repo.listar_ativos_da_unidade.return_value[1].id
    uow.commit.assert_awaited_once()


async def test_user_id_que_coincide_com_email_de_outra_pessoa_e_ambiguo(contexto):
    service, admin, request, projetos, casos, uow = contexto
    usuarios = service._usuario_repo.listar_ativos_da_unidade.return_value
    usuarios[0].definir_user_id("backup@example.com")

    with pytest.raises(PlanilhaProjetoInvalida) as erro:
        await service.importar(
            admin, request, criar_arquivo(("Clock_001", "backup@example.com", "BACK-001"))
        )

    assert [(item.codigo, item.valor) for item in erro.value.erros] == [
        ("pessoa_ambigua", "backup@example.com")
    ]
    projetos.adicionar.assert_not_awaited()
    casos.adicionar.assert_not_awaited()
    uow.commit.assert_not_awaited()


def linhas_de_casos(quantidade):
    return [
        (f"Clock_{indice:03}", "dev@example.com", "backup@example.com")
        for indice in range(1, quantidade + 1)
    ]


async def test_importacao_grava_o_automation_level_de_cada_caso(contexto):
    service, admin, request, _, casos, uow = contexto

    resposta = await service.importar(
        admin, request, criar_arquivo(*linhas_de_casos(3), niveis=[1, None, 3])
    )

    assert resposta.quantidade_casos == 3
    niveis = [chamada.args[0].automation_level for chamada in casos.adicionar.call_args_list]
    assert niveis == [
        NivelAutomacaoCasoTeste.NAO_AUTOMATIZAVEL,
        None,
        NivelAutomacaoCasoTeste.TOTALMENTE_AUTOMATIZAVEL,
    ]
    uow.commit.assert_awaited_once()


async def test_importacao_sem_a_coluna_deixa_o_automation_level_vazio(contexto):
    service, admin, request, _, casos, _ = contexto

    await service.importar(admin, request, criar_arquivo())

    assert casos.adicionar.call_args.args[0].automation_level is None


async def test_automation_level_invalido_nao_persiste_nada(contexto):
    service, admin, request, projetos, casos, uow = contexto

    with pytest.raises(PlanilhaProjetoInvalida) as erro:
        await service.importar(admin, request, criar_arquivo(*linhas_de_casos(2), niveis=[1, 4]))

    assert [(e.linha, e.coluna, e.codigo, e.valor) for e in erro.value.erros] == [
        (3, "Automation Level", "valor_invalido", "4")
    ]
    projetos.adicionar.assert_not_awaited()
    casos.adicionar.assert_not_awaited()
    uow.commit.assert_not_awaited()


async def test_importacao_grava_os_textos_de_cada_caso(contexto):
    service, admin, request, _, casos, uow = contexto
    textos = {
        "Title(English)": ["Check Writing style", None],
        "Test Procedure(English)": ["1. Messages\n2-1. Select Shorten", "  "],
    }

    await service.importar(admin, request, criar_arquivo(*linhas_de_casos(2), textos=textos))

    gravados = [chamada.args[0] for chamada in casos.adicionar.call_args_list]
    assert [(caso.title, caso.procedure) for caso in gravados] == [
        ("Check Writing style", "1. Messages\n2-1. Select Shorten"),
        (None, None),
    ]
    assert gravados[0].precondition is None
    uow.commit.assert_awaited_once()


async def test_texto_longo_nao_persiste_nada(contexto):
    service, admin, request, projetos, casos, uow = contexto
    textos = {"Title(English)": ["ok", "x" * 501]}

    with pytest.raises(PlanilhaProjetoInvalida) as erro:
        await service.importar(admin, request, criar_arquivo(*linhas_de_casos(2), textos=textos))

    assert [(e.linha, e.coluna, e.codigo) for e in erro.value.erros] == [
        (3, "Title(English)", "texto_muito_longo")
    ]
    projetos.adicionar.assert_not_awaited()
    casos.adicionar.assert_not_awaited()
    uow.commit.assert_not_awaited()


# Spec 075: a Planned date da planilha vira a data planejada do projeto.
async def test_planned_date_da_planilha_vira_a_data_planejada_do_projeto(contexto):
    service, admin, request, projetos, _, uow = contexto

    await service.importar(admin, request, criar_arquivo(planejada="19/12/2026"))

    projeto = projetos.adicionar.call_args.args[0]
    assert projeto.data_planejada == date(2026, 12, 19)
    assert projeto.planejamento_iniciado_em == date(2026, 11, 11)
    uow.commit.assert_awaited_once()


async def test_sem_planned_date_o_projeto_nasce_sem_planejamento(contexto):
    service, admin, request, projetos, _, _ = contexto

    await service.importar(admin, request, criar_arquivo())

    projeto = projetos.adicionar.call_args.args[0]
    assert projeto.data_planejada is None
    assert projeto.planejamento_iniciado_em is None


async def test_planned_date_no_passado_nao_persiste_nada(contexto):
    service, admin, request, projetos, casos, uow = contexto

    with pytest.raises(PlanilhaProjetoInvalida) as erro:
        await service.importar(admin, request, criar_arquivo(planejada="10/11/2026"))

    assert [e.codigo for e in erro.value.erros] == ["data_planejada_fora_do_intervalo"]
    projetos.adicionar.assert_not_awaited()
    casos.adicionar.assert_not_awaited()
    uow.commit.assert_not_awaited()


async def test_o_hoje_da_importacao_segue_o_fuso_de_quem_importa(contexto):
    service, admin, request, projetos, _, _ = contexto
    # 11/11 às 15h em UTC ainda é 11/11 em São Paulo; em Tóquio já é 12/11.
    with pytest.raises(PlanilhaProjetoInvalida):
        await service.importar(admin, request, criar_arquivo(planejada="11/11/2026"), "Asia/Tokyo")

    await service.importar(
        admin, request, criar_arquivo(planejada="11/11/2026"), "America/Sao_Paulo"
    )
    assert projetos.adicionar.call_args.args[0].planejamento_iniciado_em == date(2026, 11, 11)
