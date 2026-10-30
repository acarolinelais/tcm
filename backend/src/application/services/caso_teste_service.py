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
from src.application.schemas.historico_caso_teste import (
    HistoricoCasoTesteResponse,
    ids_de_usuarios,
    to_historico_response,
)
from src.application.schemas.kanban import (
    KanbanCardResponse,
    KanbanResponse,
    to_card_response,
    to_kanban_response,
)
from src.application.schemas.link_pull_request import (
    AdicionarLinkPullRequestRequest,
    LinkPullRequestResponse,
    LinksPullRequestResponse,
)
from src.application.schemas.link_pull_request import to_response as link_to_response
from src.application.validators.semana import intervalo_semana_iso
from src.domain.common.exceptions import ConflictException, ForbiddenException, NotFoundException
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.caso_teste import CasoTeste, StatusCasoTeste
from src.domain.entities.interfaces.caso_teste_repository import CasoTesteRepository
from src.domain.entities.interfaces.historico_caso_teste_repository import (
    HistoricoCasoTesteRepository,
)
from src.domain.entities.interfaces.link_pull_request_repository import LinkPullRequestRepository
from src.domain.entities.interfaces.projeto_repository import ProjetoRepository
from src.domain.entities.interfaces.time_membro_repository import TimeMembroRepository
from src.domain.entities.interfaces.time_repository import TimeRepository
from src.domain.entities.interfaces.unit_of_work import UnitOfWork
from src.domain.entities.interfaces.usuario_repository import UsuarioRepository
from src.domain.entities.link_pull_request import LinkPullRequest
from src.domain.entities.projeto import Projeto
from src.domain.entities.time import Time
from src.domain.queries.link_pull_request_com_autor import LinkPullRequestComAutor


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
    # Colunas do Kanban na ordem do ciclo (spec 037, RN-02): In Fixes antes de Done.
    ORDEM_KANBAN = (
        StatusCasoTeste.TO_DO,
        StatusCasoTeste.IN_PROGRESS,
        StatusCasoTeste.IN_REVIEW,
        StatusCasoTeste.IN_VALIDATION,
        StatusCasoTeste.IN_FIXES,
        StatusCasoTeste.DONE,
        StatusCasoTeste.CANCELLED,
    )

    def __init__(
        self,
        caso_repo: CasoTesteRepository,
        projeto_repo: ProjetoRepository,
        time_repo: TimeRepository,
        membro_repo: TimeMembroRepository,
        usuario_repo: UsuarioRepository,
        link_repo: LinkPullRequestRepository,
        uow: UnitOfWork,
        historico_repo: HistoricoCasoTesteRepository | None = None,
    ) -> None:
        self._caso_repo = caso_repo
        self._projeto_repo = projeto_repo
        self._time_repo = time_repo
        self._membro_repo = membro_repo
        self._usuario_repo = usuario_repo
        self._link_repo = link_repo
        self._uow = uow
        self._historico_repo = historico_repo

    async def obter(
        self, usuario_atual: UsuarioAutenticado, caso_id: UUID
    ) -> CasoTesteDetalheResponse:
        caso, _ = await self._obter_caso_visivel(usuario_atual, caso_id)
        return to_detalhe_response(caso)

    async def historico(
        self, usuario_atual: UsuarioAutenticado, caso_id: UUID
    ) -> HistoricoCasoTesteResponse:
        # Quem vê o caso vê o histórico (spec 038, RN-06): mesma checagem do detalhe.
        await self._obter_caso_visivel(usuario_atual, caso_id)
        registros = await self._historico_repo.listar(usuario_atual.unidade_id, caso_id)
        dados = await self._usuario_repo.dados_por_usuarios(
            usuario_atual.unidade_id, tuple(ids_de_usuarios(registros))
        )
        return to_historico_response(registros, {id_: nome for id_, (nome, *_) in dados.items()})

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

    async def obter_kanban(
        self, usuario_atual: UsuarioAutenticado, projeto_id: UUID
    ) -> KanbanResponse:
        self._exigir_permissao(usuario_atual, "test_cases.consultar")
        _, time = await self._obter_projeto_visivel(usuario_atual, projeto_id)
        eh_gestor = self._pode_gerenciar(usuario_atual, time)
        cards = await self._caso_repo.listar_cards_por_projeto(usuario_atual.unidade_id, projeto_id)
        por_status: dict[StatusCasoTeste, list[KanbanCardResponse]] = {
            status: [] for status in self.ORDEM_KANBAN
        }
        for item in cards:
            destinos = [
                status
                for status in self.ORDEM_KANBAN
                if status is not item.caso.status
                and self._pode_mudar_status(usuario_atual, item.caso, eh_gestor, status)
            ]
            por_status[item.caso.status].append(to_card_response(item, destinos))
        return to_kanban_response(projeto_id, por_status)

    @staticmethod
    def _pode_mudar_status(
        usuario_atual: UsuarioAutenticado,
        caso: CasoTeste,
        eh_gestor: bool,
        destino: StatusCasoTeste,
    ) -> bool:
        # Usada por atualizar() e pelo Kanban: gestão e responsável principal mudam para qualquer
        # Status; o backup só exclui (spec 026).
        if eh_gestor or caso.responsavel_id == usuario_atual.id:
            return True
        return caso.backup_id == usuario_atual.id and destino is StatusCasoTeste.CANCELLED

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
        caso, time = await self._obter_caso_visivel(usuario_atual, caso_id)
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
                    campos_enviados - {"justificativa_exclusao"} != {"status"}
                    or request.status is None
                    or not self._pode_mudar_status(usuario_atual, caso, False, request.status)
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
        caso, _ = await self._obter_caso_visivel(usuario_atual, caso_id)
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

    async def listar_pull_requests(
        self, usuario_atual: UsuarioAutenticado, caso_id: UUID
    ) -> LinksPullRequestResponse:
        caso, time = await self._obter_caso_visivel(usuario_atual, caso_id)
        links = await self._link_repo.listar_ativos_por_caso(usuario_atual.unidade_id, caso.id)
        return LinksPullRequestResponse(
            itens=[link_to_response(link) for link in links],
            pode_remover=self._pode_gerenciar(usuario_atual, time),
        )

    async def adicionar_pull_request(
        self,
        usuario_atual: UsuarioAutenticado,
        caso_id: UUID,
        request: AdicionarLinkPullRequestRequest,
    ) -> LinkPullRequestResponse:
        caso, _ = await self._obter_caso_visivel(usuario_atual, caso_id)
        if await self._link_repo.existe_ativo(usuario_atual.unidade_id, caso.id, request.url):
            raise ConflictException("Este link de PR já está registrado neste Test Case.")
        link = LinkPullRequest(usuario_atual.unidade_id, caso.id, request.url, usuario_atual.id)
        await self._link_repo.adicionar(link)
        await self._uow.commit()
        criado = await self._link_repo.obter_por_id(usuario_atual.unidade_id, link.id)
        return link_to_response(LinkPullRequestComAutor(criado or link, usuario_atual.nome))

    async def remover_pull_request(
        self, usuario_atual: UsuarioAutenticado, caso_id: UUID, link_id: UUID
    ) -> None:
        caso, time = await self._obter_caso_visivel(usuario_atual, caso_id)
        # Spec 030, RN-04: o dev vê e adiciona, mas só a gestão remove.
        self._exigir_gestao(usuario_atual, time)
        link = await self._link_repo.obter_por_id(usuario_atual.unidade_id, link_id)
        if link is None or not link.ativo or link.caso_teste_id != caso.id:
            raise NotFoundException("Link de PR não encontrado.")
        link.inativar()
        await self._link_repo.atualizar(link)
        await self._uow.commit()

    async def _obter_caso_visivel(
        self, usuario_atual: UsuarioAutenticado, caso_id: UUID
    ) -> tuple[CasoTeste, Time]:
        self._exigir_permissao(usuario_atual, "test_cases.consultar")
        caso = await self._caso_repo.obter_por_id(usuario_atual.unidade_id, caso_id)
        if caso is None:
            raise NotFoundException("Test Case não encontrado.")
        _, time = await self._obter_projeto_visivel(usuario_atual, caso.projeto_id)
        return caso, time

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
