from src.application.schemas.importacao_sdf import ImportarRelatorioSdfResponse
from src.application.validators.relatorio_sdf import validar_relatorio_sdf
from src.domain.common.exceptions import ConflictException, ForbiddenException, NotFoundException
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.execucao_sdf import ExecucaoSdf
from src.domain.entities.importacao_sdf import ImportacaoSdf
from src.domain.entities.interfaces.caso_teste_repository import CasoTesteRepository
from src.domain.entities.interfaces.execucao_sdf_repository import ExecucaoSdfRepository
from src.domain.entities.interfaces.importacao_sdf_repository import ImportacaoSdfRepository
from src.domain.entities.interfaces.modelo_dispositivo_repository import (
    ModeloDispositivoRepository,
)
from src.domain.entities.interfaces.projeto_modelo_repository import ProjetoModeloRepository
from src.domain.entities.interfaces.projeto_repository import ProjetoRepository
from src.domain.entities.interfaces.resultado_form_factor_repository import (
    ResultadoFormFactorRepository,
)
from src.domain.entities.interfaces.time_repository import TimeRepository
from src.domain.entities.interfaces.unit_of_work import UnitOfWork
from src.domain.entities.resultado_form_factor import ResultadoFormFactor


class ImportacaoSdfServiceImpl:
    def __init__(
        self,
        projeto_repo: ProjetoRepository,
        time_repo: TimeRepository,
        caso_repo: CasoTesteRepository,
        modelo_repo: ModeloDispositivoRepository,
        projeto_modelo_repo: ProjetoModeloRepository,
        importacao_repo: ImportacaoSdfRepository,
        execucao_repo: ExecucaoSdfRepository,
        resultado_repo: ResultadoFormFactorRepository,
        uow: UnitOfWork,
    ) -> None:
        self._projeto_repo = projeto_repo
        self._time_repo = time_repo
        self._caso_repo = caso_repo
        self._modelo_repo = modelo_repo
        self._projeto_modelo_repo = projeto_modelo_repo
        self._importacao_repo = importacao_repo
        self._execucao_repo = execucao_repo
        self._resultado_repo = resultado_repo
        self._uow = uow

    async def importar(
        self, usuario_atual: UsuarioAutenticado, projeto_id, conteudo: bytes
    ) -> ImportarRelatorioSdfResponse:
        if usuario_atual.perfil_codigo not in {
            "ADMIN_UNIDADE",
            "GERENTE",
            "KP",
        } or not usuario_atual.pode("form_factor.importar"):
            raise ForbiddenException("Você não tem permissão para importar resultados Form Factor.")
        relatorio = validar_relatorio_sdf(conteudo)
        projeto = await self._projeto_repo.obter_por_id(usuario_atual.unidade_id, projeto_id)
        if projeto is None:
            raise NotFoundException("Projeto não encontrado.")
        time = await self._time_repo.obter_por_id(usuario_atual.unidade_id, projeto.time_id)
        if time is None or not usuario_atual.time_no_escopo(time.id, time.setor_id):
            raise NotFoundException("Projeto não encontrado.")

        vinculos = await self._projeto_modelo_repo.listar_por_projeto(
            usuario_atual.unidade_id, projeto.id
        )
        modelos = await self._modelo_repo.listar_por_ids(
            usuario_atual.unidade_id,
            tuple(vinculo.modelo_dispositivo_id for vinculo in vinculos),
        )
        modelos_por_nome = {modelo.nome.casefold(): modelo for modelo in modelos}
        ids_modelos_relatorio = {
            nome.casefold() for linha in relatorio.linhas for nome in linha.resultados
        }
        if ids_modelos_relatorio - modelos_por_nome.keys():
            desconhecidos = sorted(ids_modelos_relatorio - modelos_por_nome.keys())
            raise ConflictException(
                "Modelos do relatório não associados ao projeto: " + ", ".join(desconhecidos)
            )
        if any(linha.one_ui.casefold() != projeto.one_ui.casefold() for linha in relatorio.linhas):
            raise ConflictException("A One UI do relatório deve corresponder à versão do projeto.")

        casos = {}
        for linha in relatorio.linhas:
            caso = await self._caso_repo.obter_por_projeto_tc_id(
                usuario_atual.unidade_id, projeto.id, linha.tc_id
            )
            if caso is None:
                raise ConflictException(
                    f"Linha {linha.linha}: TC ID '{linha.tc_id}' não pertence ao projeto."
                )
            casos[linha.tc_id] = caso

        importacao = ImportacaoSdf(usuario_atual.unidade_id, projeto.id, usuario_atual.id)
        await self._importacao_repo.adicionar(importacao)
        quantidade_resultados = 0
        for linha in relatorio.linhas:
            execucao = ExecucaoSdf(
                usuario_atual.unidade_id,
                importacao.id,
                casos[linha.tc_id].id,
                linha.sdf_id,
                linha.data_reportada,
                linha.one_ui,
            )
            await self._execucao_repo.adicionar(execucao)
            for nome_modelo, valor in linha.resultados.items():
                modelo = modelos_por_nome[nome_modelo.casefold()]
                await self._resultado_repo.adicionar(
                    ResultadoFormFactor(usuario_atual.unidade_id, execucao.id, modelo.id, valor)
                )
                quantidade_resultados += 1
        await self._uow.commit()
        return ImportarRelatorioSdfResponse(
            importacao_id=importacao.id,
            quantidade_execucoes=len(relatorio.linhas),
            quantidade_resultados=quantidade_resultados,
        )
