from decimal import Decimal, InvalidOperation

from src.application.schemas.importacao_sdf import ImportarRelatorioSdfResponse
from src.application.validators.importacao_projeto import ErroImportacaoPlanilha
from src.application.validators.relatorio_sdf import RelatorioSdfInvalido, ler_relatorio_sdf
from src.domain.common.exceptions import ForbiddenException, NotFoundException
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
from src.domain.entities.interfaces.rodada_form_factor_repository import (
    RodadaFormFactorRepository,
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
        rodada_repo: RodadaFormFactorRepository,
    ) -> None:
        self._rodada_repo = rodada_repo
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
        self,
        usuario_atual: UsuarioAutenticado,
        projeto_id,
        nome_arquivo: str | None,
        conteudo: bytes,
    ) -> ImportarRelatorioSdfResponse:
        """Relatório SDF no formato novo (spec 060): com qualquer problema, nada é gravado."""
        if usuario_atual.perfil_codigo not in {
            "ADMIN_UNIDADE",
            "GERENTE",
            "KP",
        } or not usuario_atual.pode("form_factor.importar"):
            raise ForbiddenException("Você não tem permissão para importar resultados Form Factor.")
        unidade_id = usuario_atual.unidade_id
        projeto = await self._projeto_repo.obter_por_id(unidade_id, projeto_id)
        if projeto is None:
            raise NotFoundException("Projeto não encontrado.")
        time = await self._time_repo.obter_por_id(unidade_id, projeto.time_id)
        if time is None or not usuario_atual.time_no_escopo(time.id, time.setor_id):
            raise NotFoundException("Projeto não encontrado.")

        relatorio = ler_relatorio_sdf(nome_arquivo, conteudo)
        # Os erros do arquivo e os do projeto saem juntos, numa resposta só (RN-12).
        erros = list(relatorio.erros)
        vinculos = await self._projeto_modelo_repo.listar_por_projeto(unidade_id, projeto.id)
        modelos = await self._modelo_repo.listar_por_ids(
            unidade_id, tuple(vinculo.modelo_dispositivo_id for vinculo in vinculos)
        )
        modelo = next(
            (
                item
                for item in modelos
                if item.nome.strip().casefold() == relatorio.device.casefold()
            ),
            None,
        )
        if relatorio.device and modelo is None:
            erros.append(
                ErroImportacaoPlanilha(
                    None,
                    "c4",
                    f"O device '{relatorio.device}' não está associado ao projeto.",
                    "sdf_device_fora_do_projeto",
                    "C4",
                    relatorio.device,
                )
            )
        if relatorio.sdf_id and (
            await self._rodada_repo.existe_sdf_id_no_projeto(
                unidade_id, projeto.id, relatorio.sdf_id
            )
            or await self._execucao_repo.existe_sdf_id_importado_no_projeto(
                unidade_id, projeto.id, relatorio.sdf_id
            )
        ):
            erros.append(
                ErroImportacaoPlanilha(
                    None,
                    "sdf_id",
                    f"O SDF ID '{relatorio.sdf_id}' já foi usado neste projeto.",
                    "sdf_id_repetido",
                    None,
                    relatorio.sdf_id,
                )
            )
        casos = {}
        for linha in relatorio.linhas:
            if not _mesma_one_ui(linha.one_ui, projeto.one_ui):
                erros.append(
                    ErroImportacaoPlanilha(
                        linha.linha,
                        "test file path",
                        f"Linha {linha.linha}: a One UI {linha.one_ui} não é a do projeto "
                        f"({projeto.one_ui}).",
                        "sdf_one_ui_diferente",
                        "Test File Path",
                        linha.one_ui,
                        {"esperado": projeto.one_ui},
                    )
                )
            caso = await self._caso_repo.obter_por_projeto_tc_id(
                unidade_id, projeto.id, linha.tc_id
            )
            if caso is None:
                erros.append(
                    ErroImportacaoPlanilha(
                        linha.linha,
                        "script name",
                        f"Linha {linha.linha}: o TC ID '{linha.tc_id}' não pertence ao projeto.",
                        "sdf_tc_fora_do_projeto",
                        "Script Name",
                        linha.tc_id,
                    )
                )
            casos[linha.tc_id] = caso
        if erros:
            raise RelatorioSdfInvalido(tuple(erros))

        importacao = ImportacaoSdf(unidade_id, projeto.id, usuario_atual.id)
        await self._importacao_repo.adicionar(importacao)
        for linha in relatorio.linhas:
            execucao = ExecucaoSdf(
                unidade_id,
                importacao.id,
                casos[linha.tc_id].id,
                relatorio.sdf_id,
                relatorio.data_execucao,
                linha.one_ui,
            )
            await self._execucao_repo.adicionar(execucao)
            await self._resultado_repo.adicionar(
                ResultadoFormFactor(
                    unidade_id, execucao.id, modelo.id, linha.resultado, linha.descricao
                )
            )
        # Spec 065: o relatório pode fechar o caso em todos os devices.
        await self._caso_repo.marcar_todos_aprovados(
            unidade_id, projeto.id, [caso.id for caso in casos.values()]
        )
        await self._uow.commit()
        return ImportarRelatorioSdfResponse(
            importacao_id=importacao.id,
            quantidade_execucoes=len(relatorio.linhas),
            quantidade_resultados=len(relatorio.linhas),
        )


def _mesma_one_ui(do_relatorio: str, do_projeto: str) -> bool:
    """Compara pelo número da versão: `10` e `10.0` são a mesma (RN-08)."""
    try:
        return Decimal(do_relatorio) == Decimal(do_projeto.strip())
    except InvalidOperation:
        return do_relatorio.casefold() == do_projeto.strip().casefold()
