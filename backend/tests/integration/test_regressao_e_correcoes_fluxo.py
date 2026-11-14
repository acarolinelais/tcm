import os
from datetime import datetime

import pytest
from sqlalchemy import select, update
from src.application.services.importacao_sdf_service import ImportacaoSdfServiceImpl
from src.application.services.registro_de_correcoes import RegistroDeCorrecoes
from src.domain.entities.correcao import Correcao, OrigemCorrecao, ResultadoCorrecao
from src.infrastructure.data.auditoria import ContextoAuditoriaImpl
from src.infrastructure.data.models.caso_teste_model import CasoTesteModel
from src.infrastructure.data.models.correcao_model import CorrecaoModel
from src.infrastructure.data.models.importacao_sdf_model import ImportacaoSdfModel
from src.infrastructure.data.models.projeto_model import ProjetoModel
from src.infrastructure.data.unit_of_work import UnitOfWorkImpl
from src.infrastructure.repositories.caso_teste_repository import CasoTesteRepositoryImpl
from src.infrastructure.repositories.correcao_repository import CorrecaoRepositoryImpl
from src.infrastructure.repositories.execucao_sdf_repository import ExecucaoSdfRepositoryImpl
from src.infrastructure.repositories.importacao_sdf_repository import ImportacaoSdfRepositoryImpl
from src.infrastructure.repositories.importacao_sdf_status_repository import (
    ImportacaoSdfStatusRepositoryImpl,
)
from src.infrastructure.repositories.modelo_dispositivo_repository import (
    ModeloDispositivoRepositoryImpl,
)
from src.infrastructure.repositories.projeto_modelo_repository import ProjetoModeloRepositoryImpl
from src.infrastructure.repositories.projeto_repository import ProjetoRepositoryImpl
from src.infrastructure.repositories.resultado_form_factor_repository import (
    ResultadoFormFactorRepositoryImpl,
)
from src.infrastructure.repositories.rodada_form_factor_repository import (
    RodadaFormFactorRepositoryImpl,
)
from src.infrastructure.repositories.time_repository import TimeRepositoryImpl
from tests.integration import test_importacao_sdf_fluxo as fluxo
from tests.unit.application.validators.test_relatorio_sdf import relatorio

# A mesma fixture e os mesmos helpers do fluxo de importação.
cenario = fluxo.cenario
_gerente, _mudar, _status = fluxo._gerente, fluxo._mudar, fluxo._status

pytestmark = pytest.mark.skipif(
    not os.environ.get("SDF_TEST_DATABASE_URL"),
    reason="Defina SDF_TEST_DATABASE_URL para executar a integração com Postgres.",
)

# A data do relatório de exemplo (F4), que é a data da execução.
DATA_DO_RELATORIO = datetime(2026, 10, 21, 18, 43, 35)


def _importacao(session):
    return ImportacaoSdfServiceImpl(
        ProjetoRepositoryImpl(session),
        TimeRepositoryImpl(session),
        CasoTesteRepositoryImpl(session),
        ModeloDispositivoRepositoryImpl(session),
        ProjetoModeloRepositoryImpl(session),
        ImportacaoSdfRepositoryImpl(session),
        ExecucaoSdfRepositoryImpl(session),
        ResultadoFormFactorRepositoryImpl(session),
        UnitOfWorkImpl(session),
        RodadaFormFactorRepositoryImpl(session),
        ImportacaoSdfStatusRepositoryImpl(session),
        ContextoAuditoriaImpl(session),
        RegistroDeCorrecoes(CorrecaoRepositoryImpl(session)),
    )


async def _importar(cenario, resultado, sdf_id="900000-000001", data=None, tc_id="Keyboard_000001"):
    """Relatório do S26 (SM-S948B) só com um caso."""
    linhas = [(f"{tc_id}.py", resultado, "", "Keyboard_A_OneUI95.ts")]
    conteudo = relatorio(linhas, data) if data else relatorio(linhas)
    return await _importacao(cenario.session).importar(
        _gerente(cenario), cenario.projeto_id, f"{sdf_id}_0_Test_1_Detail.xlsx", conteudo
    )


async def _correcoes(cenario, caso_id, so_ativas=True):
    filtros = [CorrecaoModel.caso_teste_id == caso_id]
    if so_ativas:
        filtros.append(CorrecaoModel.ativo.is_(True))
    return (
        (
            await cenario.session.execute(
                select(CorrecaoModel).where(*filtros).order_by(CorrecaoModel.tentativa)
            )
        )
        .scalars()
        .all()
    )


@pytest.mark.asyncio
async def test_importacao_reabre_caso_done_e_abre_tentativa_regressao(cenario):
    # CA-01.
    caso = cenario.casos[0]
    await _mudar(cenario, caso, status="Done")

    feita = await _importar(cenario, "FAIL")

    assert await _status(cenario, caso) == {caso: "InFixes"}
    [correcao] = await _correcoes(cenario, caso)
    assert (correcao.tentativa, correcao.origem, correcao.resultado) == (1, "regressao", None)
    assert correcao.falha_em == DATA_DO_RELATORIO
    assert correcao.aberta_por_importacao_id == feita.importacao_id


@pytest.mark.asyncio
async def test_regressao_com_dev_fix_abre_a_tentativa_seguinte(cenario):
    # CA-02: já passou por uma correção (tentativa 1); a regressão abre a 2 e mantém o Dev Fix.
    caso = cenario.casos[0]
    await _mudar(cenario, caso, status="Done", tentativa_correcao=1, dev_fix_id=cenario.bia)
    primeira = Correcao(
        cenario.unidade_id, caso, 1, OrigemCorrecao.VALIDACAO, datetime(2026, 10, 10)
    )
    primeira.fechar(ResultadoCorrecao.CORRIGIDA, datetime(2026, 10, 12), cenario.bia, None)
    await CorrecaoRepositoryImpl(cenario.session).adicionar(primeira)

    await _importar(cenario, "EXCEPTION")

    assert await _status(cenario, caso) == {caso: "InFixes"}
    fechada, nova = await _correcoes(cenario, caso)
    assert (fechada.resultado, fechada.fechada_em) == ("corrigida", datetime(2026, 10, 12))
    assert (nova.tentativa, nova.origem, nova.resultado) == (2, "regressao", None)
    dev_fix = await cenario.session.scalar(
        select(CasoTesteModel.dev_fix_id).where(CasoTesteModel.id == caso)
    )
    assert dev_fix == cenario.bia


@pytest.mark.asyncio
async def test_falha_relatorio_mais_antigo_nao_reabre_done(cenario):
    # CA-04: o S26 já tem PASS depois da data do relatório.
    caso = cenario.casos[0]
    await cenario.importar(caso, "SDF-RECENTE", datetime(2026, 10, 25, 9), {cenario.s26: "PASS"})
    await _mudar(cenario, caso, status="Done")

    await _importar(cenario, "FAIL")

    assert await _status(cenario, caso) == {caso: "Done"}
    assert await _correcoes(cenario, caso) == []


@pytest.mark.asyncio
async def test_falha_projeto_encerrado_nao_reabre(cenario):
    # CA-05.
    caso = cenario.casos[0]
    await _mudar(cenario, caso, status="Done")
    await cenario.session.execute(
        update(ProjetoModel).where(ProjetoModel.id == cenario.projeto_id).values(status="Completed")
    )

    await _importar(cenario, "FAIL")

    assert await _status(cenario, caso) == {caso: "Done"}


@pytest.mark.asyncio
async def test_desfazer_regressao_volta_para_done_e_apaga_a_tentativa(cenario):
    # CA-06. Criado já em Done: um UPDATE antes da importação, na mesma transação do teste, contaria
    # como mudança depois dela (o now() da importação é o início da transação).
    caso = await cenario.caso("Keyboard_000010", status="Done")
    feita = await _importar(cenario, "FAIL", tc_id="Keyboard_000010")

    await _importacao(cenario.session).desfazer(
        _gerente(cenario), cenario.projeto_id, feita.importacao_id
    )

    assert await _status(cenario, caso) == {caso: "Done"}
    assert await _correcoes(cenario, caso) == []
    [desfeita] = await _correcoes(cenario, caso, so_ativas=False)
    assert desfeita.tentativa == 1


@pytest.mark.asyncio
async def test_importacao_que_passa_fecha_a_tentativa(cenario):
    # CA-07: o S25 já passou; o FAIL abre a tentativa e um PASS no S26 depois a fecha.
    caso = cenario.casos[0]
    await cenario.importar(
        caso,
        "SDF-S25",
        datetime(2026, 10, 20, 9),
        {cenario.s25: "PASS"},
        importado_em=datetime(2026, 10, 20, 10),
    )
    await _mudar(cenario, caso, status="InValidation")
    falhou = await _importar(cenario, "FAIL", "900000-000001")
    await _mudar(cenario, caso, status="InValidation")
    # Na mesma transação as duas importações teriam o mesmo created_at.
    await cenario.session.execute(
        update(ImportacaoSdfModel)
        .where(ImportacaoSdfModel.id == falhou.importacao_id)
        .values(created_at=datetime(2026, 10, 21, 20))
    )

    await _importar(cenario, "PASS", "900000-000002", "10/24/2026 9:00:00 AM")

    assert await _status(cenario, caso) == {caso: "Done"}
    [correcao] = await _correcoes(cenario, caso)
    assert correcao.resultado == "corrigida"
    assert correcao.fechada_em == datetime(2026, 10, 24, 9, 0)
    assert correcao.corretor_id is not None
