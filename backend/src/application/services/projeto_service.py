from uuid import UUID

from src.application.schemas.projeto import (
    AtualizarProjetoRequest,
    AtualizarStatusProjetoRequest,
    CriarProjetoRequest,
    ProjetoResponse,
    to_response,
)
from src.domain.common.exceptions import ConflictException, ForbiddenException, NotFoundException
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.interfaces.modelo_dispositivo_repository import (
    ModeloDispositivoRepository,
)
from src.domain.entities.interfaces.projeto_modelo_repository import ProjetoModeloRepository
from src.domain.entities.interfaces.projeto_repository import ProjetoRepository
from src.domain.entities.interfaces.time_repository import TimeRepository
from src.domain.entities.interfaces.unit_of_work import UnitOfWork
from src.domain.entities.projeto import Projeto
from src.domain.entities.projeto_modelo import ProjetoModelo


class ProjetoServiceImpl:
    def __init__(
        self,
        projeto_repo: ProjetoRepository,
        time_repo: TimeRepository,
        modelo_repo: ModeloDispositivoRepository,
        projeto_modelo_repo: ProjetoModeloRepository,
        uow: UnitOfWork,
    ) -> None:
        self._projeto_repo = projeto_repo
        self._time_repo = time_repo
        self._modelo_repo = modelo_repo
        self._projeto_modelo_repo = projeto_modelo_repo
        self._uow = uow

    async def criar(
        self, usuario_atual: UsuarioAutenticado, request: CriarProjetoRequest
    ) -> ProjetoResponse:
        self._exigir_permissao(usuario_atual, "projetos.gerenciar")
        time = await self._time_repo.obter_por_id(usuario_atual.unidade_id, request.time_id)
        if time is None:
            raise NotFoundException("Time não encontrado.")
        if not time.ativo:
            raise ConflictException("Não é possível criar um projeto em um time inativo.")
        self._validar_escopo_time(usuario_atual, time.id, time.setor_id)

        modelo_ids = tuple(dict.fromkeys(request.modelos_ids))
        if len(modelo_ids) != len(request.modelos_ids):
            raise ConflictException("A lista contém modelos de dispositivo duplicados.")
        modelos = await self._modelo_repo.listar_por_ids(usuario_atual.unidade_id, modelo_ids)
        if len(modelos) != len(modelo_ids):
            raise ConflictException("Todos os modelos devem existir e estar ativos nesta unidade.")

        projeto = Projeto(usuario_atual.unidade_id, time.id, request.app, request.one_ui)
        await self._projeto_repo.adicionar(projeto)
        for modelo in modelos:
            await self._projeto_modelo_repo.adicionar(
                ProjetoModelo(usuario_atual.unidade_id, projeto.id, modelo.id)
            )
        await self._uow.commit()
        projeto_criado = await self._projeto_repo.obter_por_id(projeto.unidade_id, projeto.id)
        return to_response(projeto_criado or projeto)

    async def listar(
        self, usuario_atual: UsuarioAutenticado, page: int, page_size: int
    ) -> PagedResult[ProjetoResponse]:
        if usuario_atual.eh_administrador:
            projetos = await self._projeto_repo.listar_paginado(
                usuario_atual.unidade_id, page, page_size
            )
        else:
            self._exigir_consulta(usuario_atual)
            time_ids = self._times_no_escopo(usuario_atual)
            projetos = await self._projeto_repo.listar_por_times(
                usuario_atual.unidade_id, time_ids, page, page_size
            )
        return projetos.map(to_response)

    async def obter(self, usuario_atual: UsuarioAutenticado, projeto_id: UUID) -> ProjetoResponse:
        if not usuario_atual.eh_administrador:
            self._exigir_consulta(usuario_atual)
        projeto = await self._projeto_repo.obter_por_id(usuario_atual.unidade_id, projeto_id)
        if projeto is None or not projeto.ativo:
            raise NotFoundException("Projeto não encontrado.")
        time = await self._time_repo.obter_por_id(usuario_atual.unidade_id, projeto.time_id)
        if time is None or not self._time_esta_no_escopo(usuario_atual, time.id, time.setor_id):
            raise NotFoundException("Projeto não encontrado.")
        return to_response(projeto)

    async def atualizar(
        self, usuario_atual: UsuarioAutenticado, projeto_id: UUID, request: AtualizarProjetoRequest
    ) -> ProjetoResponse:
        self._exigir_permissao(usuario_atual, "projetos.gerenciar")
        projeto = await self._projeto_repo.obter_por_id(usuario_atual.unidade_id, projeto_id)
        if projeto is None or not projeto.ativo:
            raise NotFoundException("Projeto não encontrado.")
        time_atual = await self._time_repo.obter_por_id(usuario_atual.unidade_id, projeto.time_id)
        if time_atual is None:
            raise NotFoundException("Time do projeto não encontrado.")
        self._validar_escopo_time(usuario_atual, time_atual.id, time_atual.setor_id)
        projeto.atualizar_dados(request.app, request.one_ui)
        await self._projeto_repo.atualizar(projeto)
        await self._uow.commit()
        return to_response(projeto)

    async def excluir(self, usuario_atual: UsuarioAutenticado, projeto_id: UUID) -> None:
        self._exigir_permissao(usuario_atual, "projetos.gerenciar")
        projeto = await self._projeto_repo.obter_por_id(usuario_atual.unidade_id, projeto_id)
        if projeto is None or not projeto.ativo:
            raise NotFoundException("Projeto não encontrado.")
        time = await self._time_repo.obter_por_id(usuario_atual.unidade_id, projeto.time_id)
        if time is None:
            raise NotFoundException("Time do projeto não encontrado.")
        self._validar_escopo_time(usuario_atual, time.id, time.setor_id)
        await self._projeto_repo.desativar(usuario_atual.unidade_id, projeto_id)
        await self._uow.commit()

    async def atualizar_status(
        self,
        usuario_atual: UsuarioAutenticado,
        projeto_id: UUID,
        request: AtualizarStatusProjetoRequest,
    ) -> ProjetoResponse:
        self._exigir_permissao(usuario_atual, "projetos.gerenciar")
        projeto = await self._projeto_repo.obter_por_id(usuario_atual.unidade_id, projeto_id)
        if projeto is None or not projeto.ativo:
            raise NotFoundException("Projeto não encontrado.")
        time = await self._time_repo.obter_por_id(usuario_atual.unidade_id, projeto.time_id)
        if time is None:
            raise NotFoundException("Time do projeto não encontrado.")
        self._validar_escopo_time(usuario_atual, time.id, time.setor_id)
        projeto.atualizar_status(request.status)
        await self._projeto_repo.atualizar(projeto)
        await self._uow.commit()
        projeto_atualizado = await self._projeto_repo.obter_por_id(
            usuario_atual.unidade_id, projeto_id
        )
        return to_response(projeto_atualizado or projeto)

    @staticmethod
    def _exigir_permissao(usuario_atual: UsuarioAutenticado, permissao: str) -> None:
        if not usuario_atual.pode(permissao):
            raise ForbiddenException("Você não tem permissão para gerenciar projetos.")

    @staticmethod
    def _exigir_consulta(usuario_atual: UsuarioAutenticado) -> None:
        if not usuario_atual.pode("projetos.consultar") and not usuario_atual.pode(
            "test_cases.consultar"
        ):
            raise ForbiddenException("Você não tem permissão para consultar projetos.")

    @staticmethod
    def _validar_escopo_time(
        usuario_atual: UsuarioAutenticado, time_id: UUID, setor_id: UUID
    ) -> None:
        if usuario_atual.eh_administrador:
            return
        dentro_do_escopo = (
            usuario_atual.perfil_codigo == "GERENTE"
            and setor_id in usuario_atual.setores_gerenciados
        ) or (usuario_atual.perfil_codigo == "KP" and time_id in usuario_atual.time_ids)
        if not dentro_do_escopo:
            raise ForbiddenException("O time está fora do seu escopo de projetos.")

    @staticmethod
    def _times_no_escopo(usuario_atual: UsuarioAutenticado) -> tuple[UUID, ...]:
        if usuario_atual.perfil_codigo == "GERENTE":
            return usuario_atual.times_gerenciados
        if usuario_atual.perfil_codigo == "KP":
            return usuario_atual.time_ids
        return usuario_atual.time_ids

    @staticmethod
    def _time_esta_no_escopo(
        usuario_atual: UsuarioAutenticado, time_id: UUID, setor_id: UUID
    ) -> bool:
        if usuario_atual.eh_administrador:
            return True
        return (
            usuario_atual.perfil_codigo == "GERENTE"
            and setor_id in usuario_atual.setores_gerenciados
        ) or time_id in usuario_atual.time_ids
