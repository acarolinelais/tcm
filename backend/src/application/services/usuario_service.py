from datetime import datetime
from uuid import UUID

from src.application.schemas.usuario import (
    AtualizarUsuarioRequest,
    CriarUsuarioRequest,
    UsuarioResponse,
    to_response,
)
from src.domain.common.exceptions import ConflictException, NotFoundException
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.interfaces.unit_of_work import UnitOfWork
from src.domain.entities.interfaces.usuario_repository import UsuarioRepository
from src.domain.entities.usuario import Usuario


class UsuarioServiceImpl:
    def __init__(self, repo: UsuarioRepository, uow: UnitOfWork) -> None:
        self._repo = repo
        self._uow = uow

    async def listar(
        self, usuario_atual: UsuarioAutenticado, page: int, page_size: int
    ) -> PagedResult[UsuarioResponse]:
        return (await self._repo.listar_paginado(usuario_atual.unidade_id, page, page_size)).map(
            to_response
        )

    async def obter(self, usuario_atual: UsuarioAutenticado, id: UUID) -> UsuarioResponse:
        return to_response(await self._obter_entidade(usuario_atual.unidade_id, id))

    async def criar(
        self, usuario_atual: UsuarioAutenticado, request: CriarUsuarioRequest
    ) -> UsuarioResponse:
        await self._garantir_email_unico(request.email, None)
        usuario = Usuario(usuario_atual.unidade_id, request.nome, request.email)
        usuario.created_at = datetime.now()
        await self._repo.adicionar(usuario)
        await self._uow.commit()
        return to_response(usuario)

    async def atualizar(
        self, usuario_atual: UsuarioAutenticado, id: UUID, request: AtualizarUsuarioRequest
    ) -> UsuarioResponse:
        usuario = await self._obter_entidade(usuario_atual.unidade_id, id)
        if Usuario.normalizar_email(request.email) != usuario.email:
            await self._garantir_email_unico(request.email, id)
        usuario.atualizar(request.nome, request.email)
        await self._repo.atualizar(usuario)
        await self._uow.commit()
        return to_response(usuario)

    async def ativar(self, usuario_atual: UsuarioAutenticado, id: UUID) -> None:
        usuario = await self._obter_entidade(usuario_atual.unidade_id, id)
        usuario.ativar()
        await self._repo.atualizar(usuario)
        await self._uow.commit()

    async def inativar(self, usuario_atual: UsuarioAutenticado, id: UUID) -> None:
        usuario = await self._obter_entidade(usuario_atual.unidade_id, id)
        usuario.inativar()
        await self._repo.atualizar(usuario)
        await self._uow.commit()

    async def _obter_entidade(self, unidade_id: UUID, id: UUID) -> Usuario:
        usuario = await self._repo.obter_por_id(unidade_id, id)
        if usuario is None:
            raise NotFoundException(f"Usuário {id} não encontrado.")
        return usuario

    async def _garantir_email_unico(self, email: str, ignorar_id: UUID | None) -> None:
        if await self._repo.existe_email(email, ignorar_id):
            raise ConflictException("Já existe um usuário com este e-mail.")
