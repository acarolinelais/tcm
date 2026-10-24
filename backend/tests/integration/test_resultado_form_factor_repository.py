import os
from datetime import UTC, datetime
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from src.domain.entities.execucao_sdf import ExecucaoSdf
from src.domain.entities.importacao_sdf import ImportacaoSdf
from src.domain.entities.resultado_form_factor import ResultadoFormFactor
from src.infrastructure.data.models.caso_teste_model import CasoTesteModel
from src.infrastructure.data.models.modelo_dispositivo_model import ModeloDispositivoModel
from src.infrastructure.data.models.perfil_model import PerfilModel
from src.infrastructure.data.models.projeto_model import ProjetoModel
from src.infrastructure.data.models.setor_model import SetorModel
from src.infrastructure.data.models.time_model import TimeModel
from src.infrastructure.data.models.unidade_model import UnidadeModel
from src.infrastructure.data.models.usuario_model import UsuarioModel  # noqa: F401
from src.infrastructure.repositories.execucao_sdf_repository import ExecucaoSdfRepositoryImpl
from src.infrastructure.repositories.importacao_sdf_repository import ImportacaoSdfRepositoryImpl
from src.infrastructure.repositories.resultado_form_factor_repository import (
    ResultadoFormFactorRepositoryImpl,
)

pytestmark = pytest.mark.skipif(
    not os.environ.get("SDF_TEST_DATABASE_URL"),
    reason="Defina SDF_TEST_DATABASE_URL para executar a integração com Postgres.",
)


@pytest.mark.asyncio
async def test_importacoes_distintas_preservam_execucoes_e_resultados_anteriores():
    engine = create_async_engine(os.environ["SDF_TEST_DATABASE_URL"])
    unidade_id, setor_id, time_id, projeto_id, perfil_id = (uuid4() for _ in range(5))
    modelo_id, usuario_id = uuid4(), uuid4()
    caso_id, primeira_id, segunda_id = uuid4(), uuid4(), uuid4()
    try:
        async with async_sessionmaker(engine, expire_on_commit=False)() as session:
            session.add(UnidadeModel(id=unidade_id, nome=f"SDF {unidade_id}"))
            await session.flush()
            session.add_all(
                [
                    PerfilModel(
                        id=perfil_id,
                        unidade_id=unidade_id,
                        nome=f"Perfil {perfil_id}",
                    ),
                    SetorModel(id=setor_id, unidade_id=unidade_id, nome="Mobile"),
                ]
            )
            await session.flush()
            session.add(
                TimeModel(
                    id=time_id,
                    unidade_id=unidade_id,
                    setor_id=setor_id,
                    nome="Time Clock",
                )
            )
            await session.flush()
            session.add_all(
                [
                    ProjetoModel(
                        id=projeto_id,
                        unidade_id=unidade_id,
                        time_id=time_id,
                        app="Clock",
                        one_ui="9.5",
                    ),
                    ModeloDispositivoModel(
                        id=modelo_id,
                        unidade_id=unidade_id,
                        nome="S27 Ultra",
                    ),
                    UsuarioModel(
                        id=usuario_id,
                        unidade_id=unidade_id,
                        nome="Importador",
                        email=f"sdf-{usuario_id}@example.com",
                        perfil_id=perfil_id,
                    ),
                ]
            )
            await session.flush()
            session.add(
                CasoTesteModel(
                    id=caso_id,
                    unidade_id=unidade_id,
                    projeto_id=projeto_id,
                    tc_id="Clock_001",
                    category="A",
                    difficulty="Low",
                    situation="New",
                    status="To-Do",
                    responsavel_id=usuario_id,
                    backup_id=None,
                )
            )
            await session.flush()

            importacoes = ImportacaoSdfRepositoryImpl(session)
            execucoes = ExecucaoSdfRepositoryImpl(session)
            resultados = ResultadoFormFactorRepositoryImpl(session)
            primeira = ImportacaoSdf(unidade_id, projeto_id, usuario_id)
            segunda = ImportacaoSdf(unidade_id, projeto_id, usuario_id)
            primeira.id, segunda.id = primeira_id, segunda_id
            await importacoes.adicionar(primeira)
            await importacoes.adicionar(segunda)
            await session.flush()

            data = datetime(2026, 3, 23, tzinfo=UTC)
            execucao_antiga = ExecucaoSdf(
                unidade_id, primeira_id, caso_id, "12837-93482", data, "9.5"
            )
            execucao_nova = ExecucaoSdf(unidade_id, segunda_id, caso_id, "18384-98824", data, "9.5")
            await execucoes.adicionar(execucao_antiga)
            await execucoes.adicionar(execucao_nova)
            await session.flush()
            resultado_antigo = ResultadoFormFactor(
                unidade_id, execucao_antiga.id, modelo_id, "PASS"
            )
            resultado_novo = ResultadoFormFactor(unidade_id, execucao_nova.id, modelo_id, "FAIL")
            await resultados.adicionar(resultado_antigo)
            await resultados.adicionar(resultado_novo)
            await session.flush()

            historico = await importacoes.listar_por_projeto(unidade_id, projeto_id)
            execucoes_primeiro_lote = await execucoes.listar_por_importacao(unidade_id, primeira_id)
            resultados_antigos = await resultados.listar_por_execucao(
                unidade_id, execucao_antiga.id
            )

            assert {importacao.id for importacao in historico} == {primeira_id, segunda_id}
            assert len(execucoes_primeiro_lote) == 1
            assert execucoes_primeiro_lote[0].sdf_id == "12837-93482"
            assert len(resultados_antigos) == 1
            assert resultados_antigos[0].resultado == "PASS"
            assert await resultados.listar_por_execucao(uuid4(), execucao_antiga.id) == ()
    finally:
        await engine.dispose()
