from io import BytesIO
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from openpyxl import Workbook
from src.application.schemas.importacao_projeto import ImportarProjetoPlanilhaRequest
from src.application.services.importacao_projeto_service import ImportacaoProjetoServiceImpl
from src.domain.common.exceptions import ConflictException
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.time import Time
from src.domain.entities.time_membro import TimeMembro
from src.domain.entities.usuario import Usuario


def criar_arquivo(tc_id="Clock_001"):
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.append(
        ["App", "TC ID", "Difficulty", "Category", "TC Situation", "One UI", "Assignees", "Backup"]
    )
    worksheet.append(
        ["Clock", tc_id, "Low", "A", "To-Do", "9.5", "dev@example.com", "backup@example.com"]
    )
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
    usuario_repo.listar_ativos_da_unidade.return_value = [dev, backup]
    membro_repo.obter_por_time_e_usuario.side_effect = [
        TimeMembro(unidade_id, time_id, dev.id),
        TimeMembro(unidade_id, time_id, backup.id),
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
    projetos.adicionar.assert_awaited_once()
    casos.adicionar.assert_awaited_once()
    uow.commit.assert_awaited_once()


async def test_planilha_invalida_nao_persiste_dados(contexto):
    service, admin, request, projetos, casos, uow = contexto

    with pytest.raises(ValueError):
        await service.importar(admin, request, b"arquivo invalido")

    projetos.adicionar.assert_not_awaited()
    casos.adicionar.assert_not_awaited()
    uow.commit.assert_not_awaited()


async def test_assignee_fora_do_time_nao_persiste_dados(contexto):
    service, admin, request, projetos, casos, uow = contexto
    from src.domain.entities.time_membro import TimeMembro

    membro_inativo = TimeMembro(uuid4(), uuid4(), uuid4())
    membro_inativo.inativar()
    service._membro_repo.obter_por_time_e_usuario.side_effect = None
    service._membro_repo.obter_por_time_e_usuario.return_value = membro_inativo

    with pytest.raises(ConflictException, match="membro ativo"):
        await service.importar(admin, request, criar_arquivo())

    projetos.adicionar.assert_not_awaited()
    casos.adicionar.assert_not_awaited()
    uow.commit.assert_not_awaited()
