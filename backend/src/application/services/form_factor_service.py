from datetime import UTC, datetime
from uuid import UUID

from src.application.schemas.form_factor import (
    CriarRodadaFormFactorLoteRequest,
    CriarRodadaFormFactorRequest,
    EnviarResultadosRodadaRequest,
    FormFactorExecucaoResponse,
    FormFactorGlobalResponse,
    FormFactorResponse,
    FormFactorResultadosGlobaisResponse,
    FormFactorResultadosResponse,
    RodadaFormFactorCasosResponse,
    RodadaFormFactorResponse,
    to_global_response,
    to_global_resultados_response,
    to_response,
    to_resultados_response,
    to_rodada_casos_response,
    to_rodada_response,
)
from src.application.validators.semana import intervalo_semana_iso as _intervalo_semana_iso
from src.domain.common.exceptions import (
    ConflictException,
    ForbiddenException,
    NotFoundException,
)
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.execucao_sdf import ExecucaoSdf
from src.domain.entities.interfaces.caso_teste_repository import CasoTesteRepository
from src.domain.entities.interfaces.execucao_sdf_repository import ExecucaoSdfRepository
from src.domain.entities.interfaces.projeto_modelo_repository import ProjetoModeloRepository
from src.domain.entities.interfaces.projeto_repository import ProjetoRepository
from src.domain.entities.interfaces.resultado_form_factor_repository import (
    ResultadoFormFactorRepository,
)
from src.domain.entities.interfaces.rodada_form_factor_repository import RodadaFormFactorRepository
from src.domain.entities.interfaces.time_repository import TimeRepository
from src.domain.entities.interfaces.unit_of_work import UnitOfWork
from src.domain.entities.resultado_form_factor import ResultadoFormFactor
from src.domain.entities.rodada_form_factor import RodadaFormFactor


class FormFactorServiceImpl:
    def __init__(
        self,
        projeto_repo: ProjetoRepository,
        time_repo: TimeRepository,
        resultado_repo: ResultadoFormFactorRepository,
        projeto_modelo_repo: ProjetoModeloRepository,
        caso_repo: CasoTesteRepository,
        execucao_repo: ExecucaoSdfRepository,
        uow: UnitOfWork,
        rodada_repo: RodadaFormFactorRepository | None = None,
    ) -> None:
        self._projeto_repo = projeto_repo
        self._time_repo = time_repo
        self._resultado_repo = resultado_repo
        self._projeto_modelo_repo = projeto_modelo_repo
        self._caso_repo = caso_repo
        self._execucao_repo = execucao_repo
        self._uow = uow
        self._rodada_repo = rodada_repo

    async def listar_global(
        self,
        usuario_atual: UsuarioAutenticado,
        page: int,
        page_size: int,
        semana: str | None = None,
        projeto_id: UUID | None = None,
        responsavel_id: UUID | None = None,
        tc_id: str | None = None,
        sdf_id: str | None = None,
        modelo_dispositivo_id: UUID | None = None,
        resultado: str | None = None,
    ) -> FormFactorGlobalResponse:
        time_ids = self._time_ids_form_factor_global(usuario_atual)
        inicio, fim = _intervalo_semana_iso(semana)
        dados = await self._resultado_repo.listar_form_factor_global(
            usuario_atual.unidade_id,
            time_ids,
            page,
            page_size,
            inicio,
            fim,
            projeto_id,
            responsavel_id,
            tc_id,
            sdf_id,
            modelo_dispositivo_id,
            resultado,
        )
        modelos = await self._resultado_repo.listar_modelos_form_factor_global(
            usuario_atual.unidade_id, time_ids, projeto_id
        )
        responsaveis = await self._resultado_repo.listar_responsaveis_form_factor_global(
            usuario_atual.unidade_id, time_ids, projeto_id
        )
        return to_global_response(modelos, responsaveis, dados)

    async def listar_resultados_global(
        self,
        usuario_atual: UsuarioAutenticado,
        page: int,
        page_size: int,
        semana: str | None = None,
        projeto_id: UUID | None = None,
        responsavel_id: UUID | None = None,
        tc_id: str | None = None,
        sdf_id: str | None = None,
        modelo_dispositivo_id: UUID | None = None,
        resultado: str | None = None,
        origem: str | None = None,
    ) -> FormFactorResultadosGlobaisResponse:
        time_ids = self._time_ids_form_factor_global(usuario_atual)
        inicio, fim = _intervalo_semana_iso(semana)
        dados = await self._resultado_repo.listar_execucoes_form_factor_global(
            usuario_atual.unidade_id,
            time_ids,
            page,
            page_size,
            inicio,
            fim,
            projeto_id,
            responsavel_id,
            tc_id,
            sdf_id,
            modelo_dispositivo_id,
            resultado,
            origem,
        )
        modelos = await self._resultado_repo.listar_modelos_form_factor_global(
            usuario_atual.unidade_id, time_ids, projeto_id
        )
        responsaveis = await self._resultado_repo.listar_responsaveis_form_factor_global(
            usuario_atual.unidade_id, time_ids, projeto_id
        )
        return to_global_resultados_response(modelos, responsaveis, dados)

    def _time_ids_form_factor_global(
        self, usuario_atual: UsuarioAutenticado
    ) -> tuple[UUID, ...] | None:
        if (
            usuario_atual.perfil_codigo not in {"ADMIN_UNIDADE", "GERENTE", "KP"}
            or "form_factor.consultar" not in usuario_atual.permissoes
        ):
            raise ForbiddenException("Você não tem permissão para consultar Resultados Gerais.")
        if usuario_atual.perfil_codigo == "ADMIN_UNIDADE":
            return None  # None instrui o repositório a consultar todos os times da unidade.
        time_ids = (
            usuario_atual.times_gerenciados
            if usuario_atual.perfil_codigo == "GERENTE"
            else usuario_atual.time_ids
        )
        return time_ids

    async def listar(
        self,
        usuario_atual: UsuarioAutenticado,
        projeto_id: UUID,
        page: int,
        page_size: int,
        semana: str | None = None,
        responsavel_id: UUID | None = None,
        tc_id: str | None = None,
        sdf_id: str | None = None,
        modelo_dispositivo_id: UUID | None = None,
        resultado: str | None = None,
    ) -> FormFactorResponse:
        if not usuario_atual.pode("form_factor.consultar"):
            raise ForbiddenException("Você não tem permissão para consultar Form Factor.")
        projeto = await self._obter_projeto_no_escopo(usuario_atual, projeto_id)
        inicio, fim = _intervalo_semana_iso(semana)
        dados = await self._resultado_repo.listar_form_factor_por_projeto(
            usuario_atual.unidade_id,
            projeto.id,
            page,
            page_size,
            inicio,
            fim,
            responsavel_id,
            tc_id,
            sdf_id,
            modelo_dispositivo_id,
            resultado,
        )
        modelos = await self._projeto_modelo_repo.listar_modelos_do_projeto(
            usuario_atual.unidade_id, projeto.id
        )
        casos_elegiveis = await self._caso_repo.listar_em_validacao(
            usuario_atual.unidade_id, projeto.id
        )
        return to_response(modelos, dados, casos_elegiveis)

    async def listar_resultados(
        self,
        usuario_atual: UsuarioAutenticado,
        projeto_id: UUID,
        page: int,
        page_size: int,
        semana: str | None = None,
        responsavel_id: UUID | None = None,
        tc_id: str | None = None,
        sdf_id: str | None = None,
        modelo_dispositivo_id: UUID | None = None,
        resultado: str | None = None,
        origem: str | None = None,
    ) -> FormFactorResultadosResponse:
        if not usuario_atual.pode("form_factor.consultar"):
            raise ForbiddenException("Você não tem permissão para consultar Form Factor.")
        projeto = await self._obter_projeto_no_escopo(usuario_atual, projeto_id)
        inicio, fim = _intervalo_semana_iso(semana)
        dados = await self._resultado_repo.listar_execucoes_form_factor_por_projeto(
            usuario_atual.unidade_id,
            projeto.id,
            page,
            page_size,
            inicio,
            fim,
            responsavel_id,
            tc_id,
            sdf_id,
            modelo_dispositivo_id,
            resultado,
            origem,
        )
        modelos = await self._projeto_modelo_repo.listar_modelos_do_projeto(
            usuario_atual.unidade_id, projeto.id
        )
        return to_resultados_response(modelos, dados)

    async def criar_rodada_manual(
        self,
        usuario_atual: UsuarioAutenticado,
        projeto_id: UUID,
        request: CriarRodadaFormFactorRequest,
    ) -> FormFactorExecucaoResponse:
        self._exigir_gestao_rodadas(usuario_atual)
        projeto = await self._obter_projeto_no_escopo(usuario_atual, projeto_id)
        caso = await self._caso_repo.obter_por_id(usuario_atual.unidade_id, request.caso_teste_id)
        if caso is None or caso.projeto_id != projeto.id or not caso.ativo:
            raise NotFoundException("Test Case não encontrado no projeto.")

        modelos = await self._projeto_modelo_repo.listar_modelos_do_projeto(
            usuario_atual.unidade_id, projeto.id
        )
        modelos_ids = {modelo.id for modelo in modelos}
        if not request.resultados.keys() <= modelos_ids:
            raise NotFoundException("Modelo não encontrado no projeto.")

        data_reportada = datetime.now(UTC).replace(tzinfo=None)
        execucao = ExecucaoSdf(
            usuario_atual.unidade_id,
            None,
            caso.id,
            None,
            data_reportada,
            projeto.one_ui,
            origem="MANUAL",
        )
        try:
            await self._execucao_repo.adicionar(execucao)
            for modelo_id, valor in request.resultados.items():
                await self._resultado_repo.adicionar(
                    ResultadoFormFactor(usuario_atual.unidade_id, execucao.id, modelo_id, valor)
                )
            await self._uow.commit()
        except Exception:
            await self._uow.rollback()
            raise

        return FormFactorExecucaoResponse(
            execucao_id=execucao.id,
            caso_teste_id=caso.id,
            tc_id=caso.tc_id,
            responsavel_id=caso.responsavel_id,
            sdf_id=None,
            data_reportada=data_reportada.replace(tzinfo=UTC),
            origem=execucao.origem,
            resultados=request.resultados,
        )

    async def criar_rodada(
        self,
        usuario_atual: UsuarioAutenticado,
        projeto_id: UUID,
        request: CriarRodadaFormFactorLoteRequest,
    ) -> RodadaFormFactorResponse:
        self._exigir_gestao_rodadas(usuario_atual)
        projeto = await self._obter_projeto_no_escopo(usuario_atual, projeto_id)
        casos = await self._caso_repo.listar_em_validacao(usuario_atual.unidade_id, projeto.id)
        if not casos:
            raise ConflictException("Não há Test Cases em In Validation para iniciar uma rodada.")
        agora = datetime.now(UTC).replace(tzinfo=None)
        rodada = RodadaFormFactor(
            usuario_atual.unidade_id, projeto.id, usuario_atual.id, request.sdf_id, agora
        )
        if self._rodada_repo is None:
            raise RuntimeError("Repositório de rodadas não configurado.")
        try:
            await self._rodada_repo.adicionar(rodada)
            for caso in casos:
                await self._execucao_repo.adicionar(
                    ExecucaoSdf(
                        usuario_atual.unidade_id,
                        None,
                        caso.id,
                        request.sdf_id,
                        agora,
                        projeto.one_ui,
                        origem="MANUAL",
                        rodada_id=rodada.id,
                    )
                )
            await self._uow.commit()
        except Exception:
            await self._uow.rollback()
            raise
        return to_rodada_response(rodada, len(casos))

    async def listar_casos_rodada(
        self,
        usuario_atual: UsuarioAutenticado,
        projeto_id: UUID,
        rodada_id: UUID,
        page: int,
        page_size: int,
    ) -> RodadaFormFactorCasosResponse:
        if not usuario_atual.pode("form_factor.consultar"):
            raise ForbiddenException("Você não tem permissão para consultar Form Factor.")
        projeto = await self._obter_projeto_no_escopo(usuario_atual, projeto_id)
        if self._rodada_repo is None:
            raise RuntimeError("Repositório de rodadas não configurado.")
        rodada = await self._rodada_repo.obter_no_projeto(
            usuario_atual.unidade_id, projeto.id, rodada_id
        )
        if rodada is None:
            raise NotFoundException("Rodada Form Factor não encontrada.")
        casos = await self._rodada_repo.listar_casos(
            usuario_atual.unidade_id, projeto.id, rodada.id, page, page_size
        )
        modelos = await self._projeto_modelo_repo.listar_modelos_do_projeto(
            usuario_atual.unidade_id, projeto.id
        )
        return to_rodada_casos_response(rodada, casos, modelos)

    async def registrar_resultados_rodada(
        self,
        usuario_atual: UsuarioAutenticado,
        projeto_id: UUID,
        rodada_id: UUID,
        caso_teste_id: UUID,
        request: EnviarResultadosRodadaRequest,
    ) -> FormFactorExecucaoResponse:
        if not self._pode_registrar(usuario_atual):
            raise ForbiddenException(
                "Você não tem permissão para registrar resultados Form Factor."
            )
        projeto = await self._obter_projeto_no_escopo(usuario_atual, projeto_id)
        if self._rodada_repo is None:
            raise RuntimeError("Repositório de rodadas não configurado.")
        rodada = await self._rodada_repo.obter_no_projeto(
            usuario_atual.unidade_id, projeto.id, rodada_id
        )
        if rodada is None:
            raise NotFoundException("Rodada Form Factor não encontrada.")
        caso = await self._caso_repo.obter_por_id(usuario_atual.unidade_id, caso_teste_id)
        if caso is None or caso.projeto_id != projeto.id or not caso.ativo:
            raise NotFoundException("Test Case não encontrado no projeto.")
        execucao = await self._execucao_repo.obter_por_rodada_e_caso(
            usuario_atual.unidade_id, rodada.id, caso.id
        )
        if execucao is None:
            raise NotFoundException("Test Case não pertence à rodada.")
        if execucao.resultados_registrados:
            raise ConflictException("Os resultados deste Test Case já foram registrados na rodada.")

        gestor = usuario_atual.perfil_codigo in {"ADMIN_UNIDADE", "GERENTE", "KP"}
        if (
            not gestor
            and caso.responsavel_id != usuario_atual.id
            and caso.backup_id != usuario_atual.id
        ):
            raise ForbiddenException("Você só pode registrar resultados dos TCs atribuídos a você.")
        # RN-13: só a rodada atual (a mais recente do TC) recebe resultados.
        if (
            await self._execucao_repo.obter_rodada_atual_do_caso(usuario_atual.unidade_id, caso.id)
            != rodada.id
        ):
            raise ConflictException(
                "Este Test Case está numa rodada mais recente. Registre os resultados nela."
            )

        modelos = await self._projeto_modelo_repo.listar_modelos_do_projeto(
            usuario_atual.unidade_id, projeto.id
        )
        modelos_ids = {modelo.id for modelo in modelos}
        if not request.resultados.keys() <= modelos_ids:
            raise NotFoundException("Modelo não encontrado no projeto.")
        caso.registrar_resultado_form_factor(request.resultados, modelos_ids)
        execucao.resultados_registrados = True
        data_reportada = execucao.data_reportada
        try:
            await self._caso_repo.atualizar(caso)
            await self._execucao_repo.atualizar(execucao)
            for modelo_id, valor in request.resultados.items():
                await self._resultado_repo.adicionar(
                    ResultadoFormFactor(usuario_atual.unidade_id, execucao.id, modelo_id, valor)
                )
            await self._uow.commit()
        except Exception:
            await self._uow.rollback()
            raise
        return FormFactorExecucaoResponse(
            execucao_id=execucao.id,
            caso_teste_id=caso.id,
            tc_id=caso.tc_id,
            responsavel_id=caso.responsavel_id,
            sdf_id=rodada.sdf_id,
            data_reportada=data_reportada.replace(tzinfo=UTC),
            origem=execucao.origem,
            resultados=request.resultados,
            rodada_id=rodada.id,
            resultados_registrados=True,
        )

    @staticmethod
    def _pode_registrar(usuario_atual: UsuarioAutenticado) -> bool:
        return usuario_atual.perfil_codigo in {
            "ADMIN_UNIDADE",
            "GERENTE",
            "KP",
            "USUARIO_PADRAO",
        } and usuario_atual.pode("form_factor.registrar")

    @staticmethod
    def _exigir_gestao_rodadas(usuario_atual: UsuarioAutenticado) -> None:
        if usuario_atual.perfil_codigo not in {
            "ADMIN_UNIDADE",
            "GERENTE",
            "KP",
        } or not usuario_atual.pode("form_factor.registrar"):
            raise ForbiddenException(
                "Somente Admin, Gerente ou KP podem gerenciar rodadas e resultados de gestão."
            )

    async def _obter_projeto_no_escopo(self, usuario_atual: UsuarioAutenticado, projeto_id: UUID):
        projeto = await self._projeto_repo.obter_por_id(usuario_atual.unidade_id, projeto_id)
        if projeto is None:
            raise NotFoundException("Projeto não encontrado.")
        time = await self._time_repo.obter_por_id(usuario_atual.unidade_id, projeto.time_id)
        if time is None or not usuario_atual.time_no_escopo(time.id, time.setor_id):
            raise NotFoundException("Projeto não encontrado.")
        return projeto
