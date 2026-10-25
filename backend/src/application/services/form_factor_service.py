from datetime import UTC, datetime
from uuid import UUID

from src.application.schemas.form_factor import (
    CriarRodadaFormFactorRequest,
    FormFactorExecucaoResponse,
    FormFactorGlobalResponse,
    FormFactorResponse,
    FormFactorResultadosGlobaisResponse,
    FormFactorResultadosResponse,
    to_global_response,
    to_global_resultados_response,
    to_response,
    to_resultados_response,
)
from src.application.validators.semana import intervalo_semana_iso as _intervalo_semana_iso
from src.domain.common.exceptions import (
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
from src.domain.entities.interfaces.time_repository import TimeRepository
from src.domain.entities.interfaces.unit_of_work import UnitOfWork
from src.domain.entities.resultado_form_factor import ResultadoFormFactor


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
    ) -> None:
        self._projeto_repo = projeto_repo
        self._time_repo = time_repo
        self._resultado_repo = resultado_repo
        self._projeto_modelo_repo = projeto_modelo_repo
        self._caso_repo = caso_repo
        self._execucao_repo = execucao_repo
        self._uow = uow

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

    def _time_ids_form_factor_global(self, usuario_atual: UsuarioAutenticado) -> tuple[UUID, ...]:
        if (
            usuario_atual.perfil_codigo not in {"GERENTE", "KP"}
            or "form_factor.consultar" not in usuario_atual.permissoes
        ):
            raise ForbiddenException("Você não tem permissão para consultar Resultados Gerais.")
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
        return to_response(modelos, dados)

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
        if not usuario_atual.pode("form_factor.importar"):
            raise ForbiddenException(
                "Você não tem permissão para registrar resultados Form Factor."
            )
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

    async def _obter_projeto_no_escopo(self, usuario_atual: UsuarioAutenticado, projeto_id: UUID):
        projeto = await self._projeto_repo.obter_por_id(usuario_atual.unidade_id, projeto_id)
        if projeto is None:
            raise NotFoundException("Projeto não encontrado.")
        time = await self._time_repo.obter_por_id(usuario_atual.unidade_id, projeto.time_id)
        permitido = usuario_atual.eh_administrador or (
            time is not None
            and (
                usuario_atual.perfil_codigo == "GERENTE"
                and time.setor_id in usuario_atual.setores_gerenciados
                or time.id in usuario_atual.time_ids
            )
        )
        if not permitido or time is None:
            raise NotFoundException("Projeto não encontrado.")
        return projeto
