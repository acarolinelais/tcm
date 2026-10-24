from io import BytesIO
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from openpyxl import Workbook
from src.application.schemas.importacao_projeto import ImportarProjetoPlanilhaRequest
from src.application.services.importacao_projeto_service import ImportacaoProjetoServiceImpl
from src.application.validators.importacao_projeto import PlanilhaProjetoInvalida
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.caso_teste import SituacaoCasoTeste, StatusCasoTeste
from src.domain.entities.time import Time
from src.domain.entities.time_membro import TimeMembro
from src.domain.entities.usuario import Usuario


def criar_arquivo(*linhas, category="A"):
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.append(
        ["App", "TC ID", "Difficulty", "Category", "TC Situation", "One UI", "Assignees", "Backup"]
    )
    for tc_id, responsavel, backup in linhas or [
        ("Clock_001", "dev@example.com", "backup@example.com")
    ]:
        worksheet.append(["Clock", tc_id, "Low", category, "New Step", "9.5", responsavel, backup])
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
    dev = Usuario(unidade_id, "dev", "dev@example.com")
    backup = Usuario(unidade_id, "backup", "backup@example.com")
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


async def test_homonimo_e_resolvido_quando_so_um_e_membro_do_time(contexto):
    service, admin, request, projetos, casos, uow = contexto

    resposta = await service.importar(
        admin, request, criar_arquivo(("Clock_001", "Bia", "backup@example.com"))
    )

    assert resposta.quantidade_casos == 1
    uow.commit.assert_awaited_once()
