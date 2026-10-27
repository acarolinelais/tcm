from datetime import datetime
from io import BytesIO
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from openpyxl import Workbook
from src.application.services.importacao_sdf_service import ImportacaoSdfServiceImpl
from src.domain.common.exceptions import ConflictException, ForbiddenException
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


def relatorio(tc_id="Clock_001"):
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.append(["TEST ID", "SDF ID", "OneUI", "S27 ULTRA", "DATE"])
    worksheet.append([tc_id, "SDF-123", "9.5", "PASS", datetime(2026, 3, 23)])
    arquivo = BytesIO()
    workbook.save(arquivo)
    return arquivo.getvalue()


@pytest.fixture
def contexto():
    repos = [AsyncMock() for _ in range(9)]
    (
        projeto_repo,
        time_repo,
        caso_repo,
        modelo_repo,
        vinculo_repo,
        import_repo,
        exec_repo,
        resultado_repo,
        uow,
    ) = repos
    unidade_id, time_id, setor_id, admin_id = (uuid4() for _ in range(4))
    usuario = UsuarioAutenticado(admin_id, unidade_id, "ADMIN_UNIDADE")
    projeto = Projeto(unidade_id, time_id, "Clock", "9.5")
    time = Time(unidade_id, setor_id, "QA", admin_id)
    modelo = ModeloDispositivo(unidade_id, "S27 Ultra")
    caso = CasoTeste(
        unidade_id,
        projeto.id,
        "Clock_001",
        CategoriaCasoTeste.A,
        DificuldadeCasoTeste.LOW,
        uuid4(),
        uuid4(),
        SituacaoCasoTeste.NEW,
    )
    projeto_repo.obter_por_id.return_value = projeto
    time_repo.obter_por_id.return_value = time
    vinculo_repo.listar_por_projeto.return_value = [
        ProjetoModelo(unidade_id, projeto.id, modelo.id)
    ]
    modelo_repo.listar_por_ids.return_value = [modelo]
    caso_repo.obter_por_projeto_tc_id.return_value = caso
    service = ImportacaoSdfServiceImpl(*repos)
    return service, usuario, projeto, caso_repo, import_repo, exec_repo, resultado_repo, uow


async def test_importa_novo_lote_sem_substituir_dados_existentes(contexto):
    service, usuario, projeto, _, importacoes, execucoes, resultados, uow = contexto

    resposta = await service.importar(usuario, projeto.id, relatorio())

    assert resposta.quantidade_execucoes == 1
    assert resposta.quantidade_resultados == 1
    importacoes.adicionar.assert_awaited_once()
    execucoes.adicionar.assert_awaited_once()
    resultados.adicionar.assert_awaited_once()
    uow.commit.assert_awaited_once()


async def test_tc_desconhecido_nao_persiste_novo_lote(contexto):
    service, usuario, projeto, casos, importacoes, execucoes, resultados, uow = contexto
    casos.obter_por_projeto_tc_id.return_value = None

    with pytest.raises(ConflictException, match="não pertence ao projeto"):
        await service.importar(usuario, projeto.id, relatorio("Unknown_001"))

    importacoes.adicionar.assert_not_awaited()
    execucoes.adicionar.assert_not_awaited()
    resultados.adicionar.assert_not_awaited()
    uow.commit.assert_not_awaited()


async def test_dev_nao_importa_planilha_mesmo_com_permissao_concedida(contexto):
    service, usuario, projeto, _, importacoes, execucoes, resultados, uow = contexto
    dev = UsuarioAutenticado(
        usuario.id,
        usuario.unidade_id,
        "USUARIO_PADRAO",
        permissoes=frozenset({"form_factor.importar"}),
    )

    with pytest.raises(ForbiddenException):
        await service.importar(dev, projeto.id, relatorio())

    importacoes.adicionar.assert_not_awaited()
    execucoes.adicionar.assert_not_awaited()
    resultados.adicionar.assert_not_awaited()
    uow.commit.assert_not_awaited()
