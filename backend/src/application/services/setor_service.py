from src.application.schemas.setor import CriarSetorRequest, SetorResponse, to_response
from src.domain.common.exceptions import ForbiddenException
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.interfaces.setor_repository import SetorRepository
from src.domain.entities.interfaces.unit_of_work import UnitOfWork
from src.domain.entities.setor import Setor


class SetorServiceImpl:
    def __init__(self, repo: SetorRepository, uow: UnitOfWork) -> None:
        self._repo = repo
        self._uow = uow

    async def criar(
        self, usuario_atual: UsuarioAutenticado, request: CriarSetorRequest
    ) -> SetorResponse:
        if not usuario_atual.eh_administrador:
            raise ForbiddenException("Apenas administradores da unidade podem criar setores.")
        setor = Setor(usuario_atual.unidade_id, request.nome)
        await self._repo.adicionar(setor)
        await self._uow.commit()
        return to_response(setor)

    async def listar(
        self, usuario_atual: UsuarioAutenticado, page: int, page_size: int
    ) -> PagedResult[SetorResponse]:
        return (await self._repo.listar_paginado(usuario_atual.unidade_id, page, page_size)).map(
            to_response
        )
