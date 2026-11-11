from decimal import Decimal, InvalidOperation
from uuid import UUID

from src.application.schemas.importacao_sdf import (
    DesfazerImportacaoSdfResponse,
    ImportarRelatorioSdfResponse,
    UltimaImportacaoSdfResponse,
)
from src.application.validators.importacao_projeto import ErroImportacaoPlanilha
from src.application.validators.relatorio_sdf import RelatorioSdfInvalido, ler_relatorio_sdf
from src.domain.common.exceptions import (
    ConflictException,
    ForbiddenException,
    NotFoundException,
)
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.caso_teste import StatusCasoTeste
from src.domain.entities.execucao_sdf import ExecucaoSdf
from src.domain.entities.importacao_sdf import ImportacaoSdf
from src.domain.entities.importacao_sdf_status import ImportacaoSdfStatus
from src.domain.entities.interfaces.caso_teste_repository import CasoTesteRepository
from src.domain.entities.interfaces.contexto_auditoria import ContextoAuditoria
from src.domain.entities.interfaces.execucao_sdf_repository import ExecucaoSdfRepository
from src.domain.entities.interfaces.importacao_sdf_repository import ImportacaoSdfRepository
from src.domain.entities.interfaces.importacao_sdf_status_repository import (
    ImportacaoSdfStatusRepository,
)
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
from src.domain.entities.projeto import Projeto
from src.domain.entities.resultado_form_factor import ResultadoFormFactor
from src.domain.queries.auditoria import OrigemAuditoria


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
        status_repo: ImportacaoSdfStatusRepository,
        contexto_auditoria: ContextoAuditoria | None = None,
    ) -> None:
        self._status_repo = status_repo
        self._rodada_repo = rodada_repo
        self._contexto_auditoria = contexto_auditoria
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
        projeto = await self._projeto_para_importar(usuario_atual, projeto_id)
        unidade_id = usuario_atual.unidade_id

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
        execucoes = []
        for linha in relatorio.linhas:
            execucao = ExecucaoSdf(
                unidade_id,
                importacao.id,
                casos[linha.tc_id].id,
                relatorio.sdf_id,
                relatorio.data_execucao,
                linha.one_ui,
            )
            execucoes.append((execucao, casos[linha.tc_id]))
            await self._execucao_repo.adicionar(execucao)
            await self._resultado_repo.adicionar(
                ResultadoFormFactor(
                    unidade_id, execucao.id, modelo.id, linha.resultado, linha.descricao
                )
            )
        caso_ids = [caso.id for caso in casos.values()]
        # Spec 066: o Status segue os resultados, e a mudança entra no histórico como Form Factor.
        if self._contexto_auditoria is not None:
            await self._contexto_auditoria.definir_origem(OrigemAuditoria.FORM_FACTOR)
        aprovados = await self._caso_repo.listar_todos_aprovados(unidade_id, projeto.id, caso_ids)
        com_falha = {
            linha.tc_id
            for linha in relatorio.linhas
            if ResultadoFormFactor.eh_falha(linha.resultado)
        }
        mudaram = []
        for tc_id, caso in casos.items():
            anterior = caso.status
            caso.aplicar_resultado_sdf(caso.id in aprovados, tc_id in com_falha)
            if caso.status is not anterior:
                mudaram.append(caso)
        # Spec 073: cada execução fica na tentativa em que o caso ficou depois do relatório.
        for execucao, caso in execucoes:
            execucao.tentativa_correcao = caso.tentativa_correcao
            await self._execucao_repo.atualizar(execucao)
        # Spec 072, RN-08: o Done só encerra a correção se o caso voltou à validação depois do
        # Dev Fix. A consulta roda antes do atualizar(), que grava o novo status.
        fechando = [
            caso.id
            for caso in mudaram
            if caso.status is StatusCasoTeste.DONE and caso.dev_fix_em is not None
        ]
        concluiram = (
            await self._status_repo.entraram_em_validacao_depois_do_dev_fix(unidade_id, fechando)
            if fechando
            else set()
        )
        for caso in mudaram:
            await self._caso_repo.atualizar(caso)
            await self._status_repo.adicionar(
                ImportacaoSdfStatus(
                    unidade_id, importacao.id, caso.id, caso.status, caso.id in concluiram
                )
            )
        # Spec 065: o relatório pode fechar o caso em todos os devices. Depois do atualizar(), que
        # grava o caso inteiro e apagaria a data gravada por este UPDATE.
        await self._caso_repo.marcar_todos_aprovados(unidade_id, projeto.id, caso_ids)
        await self._uow.commit()
        return ImportarRelatorioSdfResponse(
            importacao_id=importacao.id,
            quantidade_execucoes=len(relatorio.linhas),
            quantidade_resultados=len(relatorio.linhas),
        )

    async def obter_ultima(
        self, usuario_atual: UsuarioAutenticado, projeto_id: UUID
    ) -> UltimaImportacaoSdfResponse | None:
        projeto = await self._projeto_para_importar(usuario_atual, projeto_id)
        ultima = await self._importacao_repo.obter_ultima_ativa(
            usuario_atual.unidade_id, projeto.id
        )
        return UltimaImportacaoSdfResponse.from_query(ultima) if ultima is not None else None

    async def desfazer(
        self, usuario_atual: UsuarioAutenticado, projeto_id: UUID, importacao_id: UUID
    ) -> DesfazerImportacaoSdfResponse:
        projeto = await self._projeto_para_importar(usuario_atual, projeto_id)
        unidade_id = usuario_atual.unidade_id
        importacao = await self._importacao_repo.obter_por_id(unidade_id, importacao_id)
        if importacao is None or importacao.projeto_id != projeto.id or not importacao.ativo:
            raise NotFoundException("Importação não encontrada.")
        ultima = await self._importacao_repo.obter_ultima_ativa(unidade_id, projeto.id)
        if ultima is None or ultima.id != importacao.id:
            raise ConflictException(
                "Esta importação não é mais a última do projeto. Atualize a página e tente de novo."
            )

        # Antes de qualquer escrita: a volta do Status também entra na auditoria e mudaria a conta.
        revertiveis = await self._status_repo.listar_revertiveis(
            unidade_id, importacao.id, importacao.created_at
        )
        if self._contexto_auditoria is not None:
            await self._contexto_auditoria.definir_origem(OrigemAuditoria.IMPORTACAO_SDF_DESFEITA)
        importacao.desfazer(usuario_atual.id)
        await self._importacao_repo.atualizar(importacao)
        revertidos = 0
        for item in revertiveis:
            caso = await self._caso_repo.obter_por_id(unidade_id, item.caso_teste_id)
            if caso is not None and caso.desfazer_resultado_sdf(item.status_aplicado):
                await self._caso_repo.atualizar(caso)
                revertidos += 1
        # Depois do atualizar(), que grava o caso inteiro e apagaria a End date recalculada.
        execucoes = await self._execucao_repo.listar_por_importacao(unidade_id, importacao.id)
        caso_ids = list({execucao.caso_teste_id for execucao in execucoes})
        await self._caso_repo.limpar_todos_aprovados(unidade_id, caso_ids)
        await self._caso_repo.marcar_todos_aprovados(unidade_id, projeto.id, caso_ids)
        await self._uow.commit()
        return DesfazerImportacaoSdfResponse(casos_revertidos=revertidos)

    async def _projeto_para_importar(
        self, usuario_atual: UsuarioAutenticado, projeto_id: UUID
    ) -> Projeto:
        if usuario_atual.perfil_codigo not in {
            "ADMIN_UNIDADE",
            "GERENTE",
            "KP",
        } or not usuario_atual.pode("form_factor.importar"):
            raise ForbiddenException("Você não tem permissão para importar resultados Form Factor.")
        projeto = await self._projeto_repo.obter_por_id(usuario_atual.unidade_id, projeto_id)
        if projeto is None:
            raise NotFoundException("Projeto não encontrado.")
        time = await self._time_repo.obter_por_id(usuario_atual.unidade_id, projeto.time_id)
        if time is None or not usuario_atual.time_no_escopo(time.id, time.setor_id):
            raise NotFoundException("Projeto não encontrado.")
        return projeto


def _mesma_one_ui(do_relatorio: str, do_projeto: str) -> bool:
    """Compara pelo número da versão: `10` e `10.0` são a mesma (RN-08)."""
    try:
        return Decimal(do_relatorio) == Decimal(do_projeto.strip())
    except InvalidOperation:
        return do_relatorio.casefold() == do_projeto.strip().casefold()
