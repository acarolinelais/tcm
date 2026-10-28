from collections.abc import Sequence
from uuid import UUID

from src.application.schemas.caso_teste import (
    AtualizarCasoTesteRequest,
    CasoTesteDetalheResponse,
    CasoTesteResponse,
    CriarCasoTesteRequest,
    to_detalhe_response,
    to_response,
)
from src.application.validators.semana import intervalo_semana_iso
from src.domain.common.exceptions import ConflictException, ForbiddenException, NotFoundException
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.caso_teste import CasoTeste, StatusCasoTeste
from src.domain.entities.interfaces.caso_teste_repository import CasoTesteRepository
from src.domain.entities.interfaces.projeto_repository import ProjetoRepository
from src.domain.entities.interfaces.time_membro_repository import TimeMembroRepository
from src.domain.entities.interfaces.time_repository import TimeRepository
from src.domain.entities.interfaces.unit_of_work import UnitOfWork
from src.domain.entities.interfaces.usuario_repository import UsuarioRepository
from src.domain.entities.projeto import Projeto
from src.domain.entities.time import Time


class CasoTesteServiceImpl:
    CAMPOS_RESPONSAVEL = frozenset(
        {
            "category",
            "difficulty",
            "status",
            "situation",
            "automation_level",
            "justificativa_exclusao",
        }
    )
    CAMPOS_GESTAO = CAMPOS_RESPONSAVEL | {"responsavel_id", "backup_id"}

    def __init__(
        self,
        caso_repo: CasoTesteRepository,
        projeto_repo: ProjetoRepository,
        time_repo: TimeRepository,
        membro_repo: TimeMembroRepository,
        usuario_repo: UsuarioRepository,
        uow: UnitOfWork,
    ) -> None:
        self._caso_repo = caso_repo
        self._projeto_repo = projeto_repo
        self._time_repo = time_repo
        self._membro_repo = membro_repo
        self._usuario_repo = usuario_repo
        self._uow = uow

    async def obter(
        self, usuario_atual: UsuarioAutenticado, caso_id: UUID
    ) -> CasoTesteDetalheResponse:
        self._exigir_permissao(usuario_atual, "test_cases.consultar")
        caso = await self._caso_repo.obter_por_id(usuario_atual.unidade_id, caso_id)
        if caso is None:
            raise NotFoundException("Test Case não encontrado.")
        await self._obter_projeto_visivel(usuario_atual, caso.projeto_id)
        return to_detalhe_response(caso)

    async def listar(
        self,
        usuario_atual: UsuarioAutenticado,
        projeto_id: UUID,
        page: int,
        page_size: int,
        responsavel_ids: Sequence[UUID] | None = None,
        associados_a_mim: bool = False,
        semana: str | None = None,
        fuso_horario: str = "UTC",
    ) -> PagedResult[CasoTesteResponse]:
        self._exigir_permissao(usuario_atual, "test_cases.consultar")
        await self._obter_projeto_visivel(usuario_atual, projeto_id)
        inicio, fim = intervalo_semana_iso(semana, fuso_horario)
        casos = await self._caso_repo.listar_por_projeto(
            usuario_atual.unidade_id,
            projeto_id,
            page,
            page_size,
            responsavel_ids,
            priorizar_responsavel_id=usuario_atual.id,
            **({"associado_usuario_id": usuario_atual.id} if associados_a_mim else {}),
            **({"data_final_inicio": inicio, "data_final_fim": fim} if semana else {}),
        )
        return casos.map(to_response)

    async def criar(
        self,
        usuario_atual: UsuarioAutenticado,
        projeto_id: UUID,
        request: CriarCasoTesteRequest,
    ) -> CasoTesteResponse:
        if not usuario_atual.eh_administrador and (
            usuario_atual.perfil_codigo not in {"GERENTE", "KP"}
            or not usuario_atual.pode("test_cases.gerenciar")
        ):
            raise ForbiddenException("Você não tem permissão para gerenciar Test Cases.")
        projeto, time = await self._obter_projeto_visivel(usuario_atual, projeto_id)
        self._exigir_gestao(usuario_atual, time)
        if await self._caso_repo.existe_tc_id(usuario_atual.unidade_id, projeto.id, request.tc_id):
            raise ConflictException("Este TC ID já está cadastrado neste projeto.")
        if request.responsavel_id == request.backup_id:
            raise ConflictException("Responsável principal e backup devem ser pessoas distintas.")
        await self._garantir_membro(time, request.responsavel_id)
        await self._garantir_membro(time, request.backup_id)

        caso = CasoTeste(
            usuario_atual.unidade_id,
            projeto.id,
            request.tc_id,
            request.category,
            request.difficulty,
            request.responsavel_id,
            request.backup_id,
            request.situation,
            automation_level=request.automation_level,
        )
        await self._caso_repo.adicionar(caso)
        await self._uow.commit()
        caso_criado = await self._caso_repo.obter_por_id(usuario_atual.unidade_id, caso.id)
        return to_response(caso_criado or caso)

    async def atualizar(
        self,
        usuario_atual: UsuarioAutenticado,
        caso_id: UUID,
        request: AtualizarCasoTesteRequest,
    ) -> CasoTesteResponse:
        self._exigir_permissao(usuario_atual, "test_cases.consultar")
        caso = await self._caso_repo.obter_por_id(usuario_atual.unidade_id, caso_id)
        if caso is None:
            raise NotFoundException("Test Case não encontrado.")
        projeto, time = await self._obter_projeto_visivel(usuario_atual, caso.projeto_id)
        campos_enviados = request.model_fields_set
        eh_gestor = self._pode_gerenciar(usuario_atual, time)
        if eh_gestor:
            if campos_enviados - self.CAMPOS_GESTAO:
                raise ForbiddenException("Os campos enviados não podem ser alterados.")
            await self._atualizar_como_gestor(caso, time, request, campos_enviados)
        else:
            if not usuario_atual.pode("test_cases.consultar"):
                raise ForbiddenException("Você não tem permissão para editar Test Cases.")
            if caso.responsavel_id != usuario_atual.id:
                if (
                    caso.backup_id != usuario_atual.id
                    or campos_enviados - {"justificativa_exclusao"} != {"status"}
                    or request.status is not StatusCasoTeste.CANCELLED
                ):
                    raise ForbiddenException("Você só pode editar Test Cases atribuídos a você.")
                caso.cancelar(request.justificativa_exclusao)
                await self._caso_repo.atualizar(caso)
                await self._uow.commit()
                caso_atualizado = await self._caso_repo.obter_por_id(
                    usuario_atual.unidade_id, caso_id
                )
                return to_response(caso_atualizado or caso)
            if campos_enviados - self.CAMPOS_RESPONSAVEL:
                raise ForbiddenException(
                    "O responsável só pode editar Status, TC Situation, Category, Difficulty "
                    "e Automation Level."
                )
            caso.atualizar_campos_do_responsavel(
                request.status or caso.status,
                request.category or caso.category,
                request.difficulty or caso.difficulty,
                request.situation,
                automation_level=request.automation_level,
                justificativa_exclusao=request.justificativa_exclusao,
            )
        await self._caso_repo.atualizar(caso)
        await self._uow.commit()
        caso_atualizado = await self._caso_repo.obter_por_id(usuario_atual.unidade_id, caso_id)
        return to_response(caso_atualizado or caso)

    async def transferir_para_backup(
        self, usuario_atual: UsuarioAutenticado, caso_id: UUID
    ) -> CasoTesteResponse:
        self._exigir_permissao(usuario_atual, "test_cases.consultar")
        caso = await self._caso_repo.obter_por_id(usuario_atual.unidade_id, caso_id)
        if caso is None:
            raise NotFoundException("Test Case não encontrado.")
        await self._obter_projeto_visivel(usuario_atual, caso.projeto_id)
        if caso.responsavel_id != usuario_atual.id:
            raise ForbiddenException("Somente o responsável principal pode transferir o Test Case.")
        try:
            caso.transferir_para_backup()
        except ValueError as erro:
            raise ConflictException(str(erro)) from erro
        await self._caso_repo.atualizar(caso)
        await self._uow.commit()
        caso_transferido = await self._caso_repo.obter_por_id(usuario_atual.unidade_id, caso_id)
        return to_response(caso_transferido or caso)

    async def _atualizar_como_gestor(
        self,
        caso: CasoTeste,
        time: Time,
        request: AtualizarCasoTesteRequest,
        campos_enviados: set[str],
    ) -> None:
        responsavel_id = request.responsavel_id or caso.responsavel_id
        backup_id = request.backup_id if "backup_id" in campos_enviados else caso.backup_id
        if {"responsavel_id", "backup_id"} & campos_enviados:
            if backup_id is None:
                raise ConflictException(
                    "Responsável principal e backup são obrigatórios na atribuição."
                )
            if responsavel_id == backup_id:
                raise ConflictException(
                    "Responsável principal e backup devem ser pessoas distintas."
                )
            await self._garantir_membro(time, responsavel_id)
            await self._garantir_membro(time, backup_id)
        caso.atualizar_gerenciamento(
            responsavel_id,
            backup_id,
            request.situation or caso.situation,
            request.status or caso.status,
            request.category or caso.category,
            request.difficulty or caso.difficulty,
            automation_level=request.automation_level,
            justificativa_exclusao=request.justificativa_exclusao,
        )

    async def _obter_projeto_visivel(
        self, usuario_atual: UsuarioAutenticado, projeto_id: UUID
    ) -> tuple[Projeto, Time]:
        projeto = await self._projeto_repo.obter_por_id(usuario_atual.unidade_id, projeto_id)
        if projeto is None or not projeto.ativo:
            raise NotFoundException("Projeto não encontrado.")
        time = await self._time_repo.obter_por_id(usuario_atual.unidade_id, projeto.time_id)
        if time is None or not usuario_atual.time_no_escopo(time.id, time.setor_id):
            raise NotFoundException("Projeto não encontrado.")
        return projeto, time

    async def _garantir_membro(self, time: Time, usuario_id: UUID) -> None:
        usuario = await self._usuario_repo.obter_por_id(time.unidade_id, usuario_id)
        membro = await self._membro_repo.obter_por_time_e_usuario(
            time.unidade_id, time.id, usuario_id
        )
        if usuario is None or not usuario.ativo or membro is None or not membro.ativo:
            raise ConflictException("Responsável e backup devem ser usuários ativos do time.")

    @classmethod
    def _pode_gerenciar(cls, usuario_atual: UsuarioAutenticado, time: Time) -> bool:
        return usuario_atual.pode("test_cases.gerenciar") and (
            usuario_atual.eh_administrador
            or (
                usuario_atual.perfil_codigo in {"GERENTE", "KP"}
                and usuario_atual.time_no_escopo(time.id, time.setor_id)
            )
        )

    @classmethod
    def _exigir_gestao(cls, usuario_atual: UsuarioAutenticado, time: Time) -> None:
        if not cls._pode_gerenciar(usuario_atual, time):
            raise ForbiddenException("Você não tem permissão para gerenciar Test Cases neste time.")

    @staticmethod
    def _exigir_permissao(usuario_atual: UsuarioAutenticado, permissao: str) -> None:
        if not usuario_atual.pode(permissao):
            raise ForbiddenException("Você não tem permissão para consultar Test Cases.")
