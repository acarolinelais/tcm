import os
from datetime import UTC, datetime
from uuid import uuid4

import pytest
import pytest_asyncio
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from src.domain.entities.execucao_sdf import ExecucaoSdf
from src.domain.entities.importacao_sdf import ImportacaoSdf
from src.domain.entities.resultado_form_factor import ResultadoFormFactor
from src.domain.entities.rodada_form_factor import RodadaFormFactor
from src.infrastructure.data.models.caso_teste_model import CasoTesteModel
from src.infrastructure.data.models.execucao_sdf_model import ExecucaoSdfModel
from src.infrastructure.data.models.importacao_sdf_model import ImportacaoSdfModel
from src.infrastructure.data.models.modelo_dispositivo_model import ModeloDispositivoModel
from src.infrastructure.data.models.perfil_model import PerfilModel
from src.infrastructure.data.models.projeto_model import ProjetoModel
from src.infrastructure.data.models.projeto_modelo_model import ProjetoModeloModel
from src.infrastructure.data.models.setor_model import SetorModel
from src.infrastructure.data.models.time_model import TimeModel
from src.infrastructure.data.models.unidade_model import UnidadeModel
from src.infrastructure.data.models.usuario_model import UsuarioModel  # noqa: F401
from src.infrastructure.repositories.execucao_sdf_repository import ExecucaoSdfRepositoryImpl
from src.infrastructure.repositories.importacao_sdf_repository import ImportacaoSdfRepositoryImpl
from src.infrastructure.repositories.projeto_modelo_repository import ProjetoModeloRepositoryImpl
from src.infrastructure.repositories.resultado_form_factor_repository import (
    ResultadoFormFactorRepositoryImpl,
)
from src.infrastructure.repositories.rodada_form_factor_repository import (
    RodadaFormFactorRepositoryImpl,
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
                        nome="Clock 9.5",
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
                    status="InValidation",
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


class _Cenario:
    """Projeto com os modelos S26 e S25 vinculados, S24 com vínculo inativo e S99 sem vínculo."""

    def __init__(self, session, unidade_id):
        self.session = session
        self.unidade_id = unidade_id
        self.projeto_id, self.ana, self.bia = uuid4(), uuid4(), uuid4()
        self.time_id = None
        self.s25, self.s26, self.s24, self.s99 = uuid4(), uuid4(), uuid4(), uuid4()

    async def montar(self):
        setor_id, time_id, perfil_id = uuid4(), uuid4(), uuid4()
        self.time_id = time_id
        self.session.add(UnidadeModel(id=self.unidade_id, nome=f"FF {self.unidade_id}"))
        await self.session.flush()
        self.session.add_all(
            [
                PerfilModel(id=perfil_id, unidade_id=self.unidade_id, nome=f"P {perfil_id}"),
                SetorModel(id=setor_id, unidade_id=self.unidade_id, nome="Mobile"),
            ]
        )
        await self.session.flush()
        self.session.add(
            TimeModel(id=time_id, unidade_id=self.unidade_id, setor_id=setor_id, nome="QA")
        )
        await self.session.flush()
        self.session.add(
            ProjetoModel(
                id=self.projeto_id,
                unidade_id=self.unidade_id,
                time_id=time_id,
                nome="Clock 9.5",
                app="Clock",
                one_ui="9.5",
            )
        )
        for usuario_id, nome in ((self.ana, "Ana"), (self.bia, "Bia")):
            self.session.add(
                UsuarioModel(
                    id=usuario_id,
                    unidade_id=self.unidade_id,
                    nome=nome,
                    email=f"{nome}-{usuario_id}@example.com",
                    perfil_id=perfil_id,
                )
            )
        for modelo_id, nome in (
            (self.s26, "SAMSUNG S26"),
            (self.s25, "SAMSUNG S25"),
            (self.s24, "SAMSUNG S24"),
            (self.s99, "SAMSUNG S99"),
        ):
            self.session.add(
                ModeloDispositivoModel(id=modelo_id, unidade_id=self.unidade_id, nome=nome)
            )
        await self.session.flush()
        for modelo_id, ativo in ((self.s26, True), (self.s25, True), (self.s24, False)):
            self.session.add(
                ProjetoModeloModel(
                    id=uuid4(),
                    unidade_id=self.unidade_id,
                    projeto_id=self.projeto_id,
                    modelo_dispositivo_id=modelo_id,
                    ativo=ativo,
                )
            )
        await self.session.flush()
        return self

    async def caso(self, tc_id, responsavel_id=None, ativo=True, status="InValidation"):
        caso_id = uuid4()
        self.session.add(
            CasoTesteModel(
                id=caso_id,
                unidade_id=self.unidade_id,
                projeto_id=self.projeto_id,
                tc_id=tc_id,
                category="A",
                difficulty="Low",
                situation="New",
                status=status,
                responsavel_id=responsavel_id or self.ana,
                backup_id=None,
                ativo=ativo,
            )
        )
        await self.session.flush()
        return caso_id

    async def importar(self, caso_id, sdf_id, data, resultados, importado_em=None):
        importacao = ImportacaoSdf(self.unidade_id, self.projeto_id, self.ana)
        await ImportacaoSdfRepositoryImpl(self.session).adicionar(importacao)
        await self.session.flush()
        if importado_em is not None:
            await self.session.execute(
                update(ImportacaoSdfModel)
                .where(ImportacaoSdfModel.id == importacao.id)
                .values(created_at=importado_em)
            )
        execucao = ExecucaoSdf(self.unidade_id, importacao.id, caso_id, sdf_id, data, "9.5")
        await ExecucaoSdfRepositoryImpl(self.session).adicionar(execucao)
        await self.session.flush()
        repo = ResultadoFormFactorRepositoryImpl(self.session)
        for modelo_id, valor in resultados.items():
            await repo.adicionar(
                ResultadoFormFactor(self.unidade_id, execucao.id, modelo_id, valor)
            )
        await self.session.flush()

    def repo(self):
        return ResultadoFormFactorRepositoryImpl(self.session)


@pytest_asyncio.fixture
async def cenario():
    engine = create_async_engine(os.environ["SDF_TEST_DATABASE_URL"])
    try:
        async with async_sessionmaker(engine, expire_on_commit=False)() as session:
            yield await _Cenario(session, uuid4()).montar()
            await session.rollback()
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_form_factor_lista_casos_em_validacao_mesmo_sem_resultado(cenario):
    await cenario.caso("TC-002", cenario.bia)
    await cenario.caso("TC-001")
    await cenario.caso("TC-003", ativo=False)

    modelos = await ProjetoModeloRepositoryImpl(cenario.session).listar_modelos_do_projeto(
        cenario.unidade_id, cenario.projeto_id
    )
    pagina = await cenario.repo().listar_form_factor_por_projeto(
        cenario.unidade_id, cenario.projeto_id, 1, 20
    )

    assert [modelo.nome for modelo in modelos] == ["SAMSUNG S25", "SAMSUNG S26"]
    assert pagina.total_count == 2
    assert [(linha.tc_id, linha.responsavel_id) for linha in pagina.items] == [
        ("TC-001", cenario.ana),
        ("TC-002", cenario.bia),
    ]
    assert all(
        linha.resultados == {} and linha.sdf_id is None and linha.data_reportada is None
        for linha in pagina.items
    )
    assert (
        await ProjetoModeloRepositoryImpl(cenario.session).listar_modelos_do_projeto(
            uuid4(), cenario.projeto_id
        )
        == ()
    )


@pytest.mark.asyncio
async def test_form_factor_oculta_casos_fora_de_validacao(cenario):
    await cenario.caso("TC-VALIDANDO")
    await cenario.caso("TC-PENDENTE", status="To-Do")

    pagina = await cenario.repo().listar_form_factor_por_projeto(
        cenario.unidade_id, cenario.projeto_id, 1, 20
    )

    assert [linha.tc_id for linha in pagina.items] == ["TC-VALIDANDO"]


@pytest.mark.asyncio
async def test_form_factor_mostra_resultado_mais_recente_por_modelo_na_mesma_linha(cenario):
    caso_id = await cenario.caso("TC-001")
    await cenario.importar(
        caso_id,
        "SDF-ANTIGO",
        datetime(2026, 3, 16, tzinfo=UTC),
        {cenario.s25: "Fail", cenario.s26: "Fail", cenario.s99: "Pass", cenario.s24: "Pass"},
    )
    await cenario.importar(
        caso_id, "SDF-NOVO", datetime(2026, 3, 23, tzinfo=UTC), {cenario.s25: "Pass"}
    )
    # Mesma data reportada: vence a importação mais recente.
    empate = datetime(2026, 3, 18, tzinfo=UTC)
    await cenario.importar(
        caso_id,
        "SDF-EMPATE-1",
        empate,
        {cenario.s26: "Blocked"},
        importado_em=datetime(2026, 3, 19, tzinfo=UTC),
    )
    await cenario.importar(
        caso_id,
        "SDF-EMPATE-2",
        empate,
        {cenario.s26: "Pass"},
        importado_em=datetime(2026, 3, 20, tzinfo=UTC),
    )

    pagina = await cenario.repo().listar_form_factor_por_projeto(
        cenario.unidade_id, cenario.projeto_id, 1, 20
    )

    assert pagina.total_count == 1
    linha = pagina.items[0]
    assert linha.resultados == {cenario.s25: "Pass", cenario.s26: "Pass"}
    assert linha.sdf_id == "SDF-NOVO"
    assert linha.data_reportada == datetime(2026, 3, 23)


@pytest.mark.asyncio
async def test_form_factor_com_semana_e_responsavel_considera_so_resultados_filtrados(cenario):
    na_semana = await cenario.caso("TC-001")
    fora_da_semana = await cenario.caso("TC-002")
    da_bia = await cenario.caso("TC-003", cenario.bia)
    await cenario.importar(
        na_semana, "SDF-1", datetime(2026, 3, 17, tzinfo=UTC), {cenario.s25: "Fail"}
    )
    await cenario.importar(
        na_semana, "SDF-2", datetime(2026, 3, 30, tzinfo=UTC), {cenario.s25: "Pass"}
    )
    await cenario.importar(
        fora_da_semana, "SDF-3", datetime(2026, 3, 30, tzinfo=UTC), {cenario.s25: "Pass"}
    )
    await cenario.importar(
        da_bia, "SDF-4", datetime(2026, 3, 18, tzinfo=UTC), {cenario.s26: "Pass"}
    )
    inicio, fim = datetime(2026, 3, 16, tzinfo=UTC), datetime(2026, 3, 23, tzinfo=UTC)

    semana = await cenario.repo().listar_form_factor_por_projeto(
        cenario.unidade_id, cenario.projeto_id, 1, 20, inicio, fim
    )
    semana_da_ana = await cenario.repo().listar_form_factor_por_projeto(
        cenario.unidade_id, cenario.projeto_id, 1, 20, inicio, fim, cenario.ana
    )
    sem_casos = await cenario.repo().listar_form_factor_por_projeto(
        cenario.unidade_id, cenario.projeto_id, 1, 20, responsavel_id=uuid4()
    )

    assert [linha.tc_id for linha in semana.items] == ["TC-001", "TC-003"]
    assert semana.items[0].resultados == {cenario.s25: "Fail"}
    assert semana.items[0].sdf_id == "SDF-1"
    assert [linha.tc_id for linha in semana_da_ana.items] == ["TC-001"]
    assert semana_da_ana.total_count == 1
    assert sem_casos.items == [] and sem_casos.total_count == 0


@pytest.mark.asyncio
async def test_form_factor_pagina_por_caso_de_teste(cenario):
    for numero in range(25):
        caso_id = await cenario.caso(f"TC-{numero:03d}")
        await cenario.importar(
            caso_id,
            f"SDF-{numero}",
            datetime(2026, 3, 23, tzinfo=UTC),
            {cenario.s25: "Pass", cenario.s26: "Fail"},
        )

    primeira = await cenario.repo().listar_form_factor_por_projeto(
        cenario.unidade_id, cenario.projeto_id, 1, 20
    )
    segunda = await cenario.repo().listar_form_factor_por_projeto(
        cenario.unidade_id, cenario.projeto_id, 2, 20
    )
    outra_unidade = await cenario.repo().listar_form_factor_por_projeto(
        uuid4(), cenario.projeto_id, 1, 20
    )

    assert (primeira.total_count, len(primeira.items), len(segunda.items)) == (25, 20, 5)
    assert segunda.items[-1].tc_id == "TC-024"
    assert all(len(linha.resultados) == 2 for linha in primeira.items + segunda.items)
    assert outra_unidade.total_count == 0


@pytest.mark.asyncio
async def test_form_factor_ignora_resultado_e_importacao_inativos(cenario):
    caso_id = await cenario.caso("TC-001")
    await cenario.importar(
        caso_id, "SDF-VALIDO", datetime(2026, 3, 16, tzinfo=UTC), {cenario.s25: "Pass"}
    )
    await cenario.importar(
        caso_id, "SDF-INATIVO", datetime(2026, 3, 23, tzinfo=UTC), {cenario.s25: "Fail"}
    )
    await cenario.session.execute(
        update(ImportacaoSdfModel)
        .where(
            ImportacaoSdfModel.id.in_(
                select(ExecucaoSdfModel.importacao_sdf_id).where(
                    ExecucaoSdfModel.sdf_id == "SDF-INATIVO"
                )
            )
        )
        .values(ativo=False)
    )

    pagina = await cenario.repo().listar_form_factor_por_projeto(
        cenario.unidade_id, cenario.projeto_id, 1, 20
    )
    semana_inativa = await cenario.repo().listar_form_factor_por_projeto(
        cenario.unidade_id,
        cenario.projeto_id,
        1,
        20,
        datetime(2026, 3, 23, tzinfo=UTC),
        datetime(2026, 3, 30, tzinfo=UTC),
    )

    assert pagina.items[0].resultados == {cenario.s25: "Pass"}
    assert pagina.items[0].sdf_id == "SDF-VALIDO"
    assert semana_inativa.total_count == 0


@pytest.mark.asyncio
async def test_listar_historico_inclui_execucoes_sdf_e_manuais_com_filtros(cenario):
    caso_id = await cenario.caso("TC-CLOCK-001")
    await cenario.importar(
        caso_id,
        "SDF-ANTIGO",
        datetime(2026, 3, 16, tzinfo=UTC),
        {cenario.s25: "FAIL"},
    )
    manual = ExecucaoSdf(
        cenario.unidade_id,
        None,
        caso_id,
        None,
        datetime(2026, 3, 23, tzinfo=UTC),
        "9.5",
        origem="MANUAL",
    )
    await ExecucaoSdfRepositoryImpl(cenario.session).adicionar(manual)
    await cenario.session.flush()
    await ResultadoFormFactorRepositoryImpl(cenario.session).adicionar(
        ResultadoFormFactor(cenario.unidade_id, manual.id, cenario.s25, "PASS")
    )
    await cenario.session.flush()

    historico = await cenario.repo().listar_execucoes_form_factor_por_projeto(
        cenario.unidade_id, cenario.projeto_id, 1, 20
    )
    filtrado = await cenario.repo().listar_execucoes_form_factor_por_projeto(
        cenario.unidade_id,
        cenario.projeto_id,
        1,
        20,
        tc_id="clock-001",
        modelo_dispositivo_id=cenario.s25,
        resultado="PASS",
    )
    sem_resultado = await cenario.repo().listar_execucoes_form_factor_por_projeto(
        cenario.unidade_id,
        cenario.projeto_id,
        1,
        20,
        modelo_dispositivo_id=cenario.s25,
        resultado="BLOCKED",
    )

    assert historico.total_count == 2
    assert [linha.origem for linha in historico.items] == ["MANUAL", "SDF"]
    assert historico.items[0].sdf_id is None
    assert historico.items[0].resultados == {cenario.s25: "PASS"}
    assert filtrado.total_count == 1 and filtrado.items[0].origem == "MANUAL"
    assert sem_resultado.total_count == 0


@pytest.mark.asyncio
async def test_rodada_lista_tc_sem_resultado_e_historico_preserva_sdf_id(cenario):
    caso_id = await cenario.caso("TC-RODADA")
    agora = datetime(2026, 10, 25, tzinfo=UTC).replace(tzinfo=None)
    rodada = RodadaFormFactor(
        cenario.unidade_id, cenario.projeto_id, cenario.ana, "  SDF #1  ", agora
    )
    rodadas = RodadaFormFactorRepositoryImpl(cenario.session)
    await rodadas.adicionar(rodada)
    execucao = ExecucaoSdf(
        cenario.unidade_id,
        None,
        caso_id,
        rodada.sdf_id,
        agora,
        "9.5",
        origem="MANUAL",
        rodada_id=rodada.id,
    )
    await ExecucaoSdfRepositoryImpl(cenario.session).adicionar(execucao)
    await cenario.session.flush()

    historico = await cenario.repo().listar_execucoes_form_factor_por_projeto(
        cenario.unidade_id, cenario.projeto_id, 1, 20
    )
    casos = await rodadas.listar_casos(cenario.unidade_id, cenario.projeto_id, rodada.id, 1, 20)

    assert historico.total_count == 1
    assert historico.items[0].rodada_id == rodada.id
    assert historico.items[0].sdf_id == "  SDF #1  "
    assert historico.items[0].resultados == {}
    assert casos.total_count == 1
    assert casos.items[0].caso_teste_id == caso_id
    assert casos.items[0].resultados == {}

    resumo = await cenario.repo().listar_form_factor_por_projeto(
        cenario.unidade_id, cenario.projeto_id, 1, 20
    )
    assert resumo.items[0].resultados == {cenario.s25: "PASS"}
    assert resumo.items[0].sdf_id is None


@pytest.mark.asyncio
async def test_form_factor_global_resumo_restringe_projetos_e_inclui_aplicabilidade(cenario):
    caso_id = await cenario.caso("TC-GLOBAL")
    await cenario.importar(
        caso_id, "SDF-GLOBAL", datetime(2026, 3, 23, tzinfo=UTC), {cenario.s25: "FAIL"}
    )

    pagina = await cenario.repo().listar_form_factor_global(
        cenario.unidade_id, (cenario.time_id,), 1, 20
    )
    vazia = await cenario.repo().listar_form_factor_global(cenario.unidade_id, (uuid4(),), 1, 20)

    assert pagina.total_count == 1
    assert pagina.items[0].projeto_id == cenario.projeto_id
    assert pagina.items[0].projeto_nome == "Clock 9.5"
    assert set(pagina.items[0].modelos_ids) == {cenario.s25, cenario.s26}
    assert pagina.items[0].resultados == {cenario.s25: "FAIL"}
    assert vazia.total_count == 0 and vazia.items == []
    modelos = await cenario.repo().listar_modelos_form_factor_global(
        cenario.unidade_id, (cenario.time_id,)
    )
    assert {modelo.id for modelo in modelos} == {cenario.s25, cenario.s26}


@pytest.mark.asyncio
async def test_form_factor_global_resultados_preserva_rodadas_e_filtra_modelo(cenario):
    caso_id = await cenario.caso("TC-GLOBAL-HISTORY")
    await cenario.importar(
        caso_id, "SDF-ANTIGO", datetime(2026, 3, 16, tzinfo=UTC), {cenario.s25: "FAIL"}
    )
    await cenario.importar(
        caso_id, "SDF-NOVO", datetime(2026, 3, 23, tzinfo=UTC), {cenario.s25: "PASS"}
    )

    pagina = await cenario.repo().listar_execucoes_form_factor_global(
        cenario.unidade_id, (cenario.time_id,), 1, 20
    )
    filtrada = await cenario.repo().listar_execucoes_form_factor_global(
        cenario.unidade_id,
        (cenario.time_id,),
        1,
        20,
        tc_id="GLOBAL-HISTORY",
        modelo_dispositivo_id=cenario.s25,
        resultado="PASS",
    )

    assert pagina.total_count == 2
    assert [linha.sdf_id for linha in pagina.items] == ["SDF-NOVO", "SDF-ANTIGO"]
    assert all(linha.projeto_nome == "Clock 9.5" for linha in pagina.items)
    assert filtrada.total_count == 1 and filtrada.items[0].resultados == {cenario.s25: "PASS"}
