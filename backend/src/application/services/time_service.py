from uuid import UUID

from src.application.schemas.time import (
    AdicionarMembroRequest,
    AtualizarPapelMembroRequest,
    CriarTimeRequest,
    TimeMembroResponse,
    TimeResponse,
    membro_to_response,
    to_response,
)
from src.domain.common.exceptions import ConflictException, ForbiddenException, NotFoundException
from src.domain.common.paged_result import PagedResult
from src.domain.common.papel_time import PapelTime
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.interfaces.setor_repository import SetorRepository
from src.domain.entities.interfaces.time_membro_repository import TimeMembroRepository
from src.domain.entities.interfaces.time_repository import TimeRepository
from src.domain.entities.interfaces.unit_of_work import UnitOfWork
from src.domain.entities.interfaces.usuario_repository import UsuarioRepository
from src.domain.entities.time import Time
from src.domain.entities.time_membro import TimeMembro


class TimeServiceImpl:
    def __init__(
        self,
        repo: TimeRepository,
        setor_repo: SetorRepository,
        membro_repo: TimeMembroRepository,
        usuario_repo: UsuarioRepository,
        uow: UnitOfWork,
    ) -> None:
        self._repo = repo
        self._setor_repo = setor_repo
        self._membro_repo = membro_repo
        self._usuario_repo = usuario_repo
        self._uow = uow

    async def criar(
        self, usuario_atual: UsuarioAutenticado, request: CriarTimeRequest
    ) -> TimeResponse:
        if not usuario_atual.admin_unidade:
            raise ForbiddenException("Apenas administradores da unidade podem criar times.")
        unidade_id = usuario_atual.unidade_id
        if await self._setor_repo.obter_por_id(unidade_id, request.setor_id) is None:
            raise NotFoundException("Setor não encontrado.")
        if request.gerente_id is not None:
            await self._garantir_usuario(unidade_id, request.gerente_id)
        time = Time(unidade_id, request.setor_id, request.nome, request.gerente_id)
        await self._repo.adicionar(time)
        await self._uow.commit()
        return to_response(time)

    async def listar(
        self,
        usuario_atual: UsuarioAutenticado,
        page: int,
        page_size: int,
        setor_id: UUID | None = None,
    ) -> PagedResult[TimeResponse]:
        return (
            await self._repo.listar_paginado(usuario_atual.unidade_id, page, page_size, setor_id)
        ).map(to_response)

    async def adicionar_membro(
        self, usuario_atual: UsuarioAutenticado, id: UUID, request: AdicionarMembroRequest
    ) -> TimeMembroResponse:
        unidade_id = usuario_atual.unidade_id
        time = await self._obter_time(unidade_id, id)
        self._garantir_gestao_time(usuario_atual, time)
        await self._garantir_usuario(unidade_id, request.usuario_id)
        if await self._membro_repo.obter_por_time_e_usuario(unidade_id, id, request.usuario_id):
            raise ConflictException("Usuário já é membro deste time.")
        membro = TimeMembro(unidade_id, id, request.usuario_id, request.papel)
        await self._membro_repo.adicionar(membro)
        await self._uow.commit()
        return membro_to_response(membro)

    async def atualizar_papel(
        self,
        usuario_atual: UsuarioAutenticado,
        id: UUID,
        usuario_id: UUID,
        request: AtualizarPapelMembroRequest,
    ) -> TimeMembroResponse:
        unidade_id = usuario_atual.unidade_id
        time = await self._obter_time(unidade_id, id)
        self._garantir_gestao_time(usuario_atual, time)
        membro = await self._membro_repo.obter_por_time_e_usuario(unidade_id, id, usuario_id)
        if membro is None:
            raise NotFoundException("Membro não encontrado.")
        if request.papel == PapelTime.KP:
            membro.marcar_como_kp()
        else:
            membro.marcar_como_dev()
        await self._membro_repo.atualizar(membro)
        await self._uow.commit()
        return membro_to_response(membro)

    async def _obter_time(self, unidade_id: UUID, id: UUID) -> Time:
        time = await self._repo.obter_por_id(unidade_id, id)
        if time is None:
            raise NotFoundException("Time não encontrado.")
        return time

    async def _garantir_usuario(self, unidade_id: UUID, id: UUID) -> None:
        if await self._usuario_repo.obter_por_id(unidade_id, id) is None:
            raise NotFoundException("Usuário não encontrado.")

    @staticmethod
    def _garantir_gestao_time(usuario_atual: UsuarioAutenticado, time: Time) -> None:
        if not usuario_atual.admin_unidade and time.gerente_id != usuario_atual.id:
            raise ForbiddenException("Apenas o gerente do time ou administrador pode alterá-lo.")
