from datetime import datetime
from uuid import UUID

from src.application.schemas.usuario import (
    AtualizarUsuarioRequest,
    CriarUsuarioRequest,
    UsuarioResponse,
    to_response,
)
from src.domain.common.exceptions import ConflictException, ForbiddenException, NotFoundException
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
        self,
        usuario_atual: UsuarioAutenticado,
        page: int,
        page_size: int,
        nome: str | None = None,
        email: str | None = None,
        ativo: bool | None = None,
        perfil_id: UUID | None = None,
        sem_perfil: bool = False,
    ) -> PagedResult[UsuarioResponse]:
        tem_filtros = any((nome, email, ativo is not None, perfil_id, sem_perfil))
        if usuario_atual.admin_unidade:
            if tem_filtros:
                result = await self._repo.listar_filtrado(
                    usuario_atual.unidade_id,
                    page,
                    page_size,
                    nome,
                    email,
                    ativo,
                    perfil_id,
                    sem_perfil,
                )
            else:
                result = await self._repo.listar_paginado(
                    usuario_atual.unidade_id, page, page_size
                )
        else:
            escopo = tuple(
                dict.fromkeys((*usuario_atual.times_gerenciados, *usuario_atual.time_ids))
            )
            if tem_filtros:
                result = await self._repo.listar_visiveis_filtrado(
                    usuario_atual.unidade_id,
                    page,
                    page_size,
                    escopo,
                    usuario_atual.id,
                    nome,
                    email,
                    ativo,
                    perfil_id,
                    sem_perfil,
                )
            else:
                result = await self._repo.listar_visiveis(
                    usuario_atual.unidade_id, page, page_size, escopo, usuario_atual.id
                )
        return result.map(to_response)

    async def obter(self, usuario_atual: UsuarioAutenticado, id: UUID) -> UsuarioResponse:
        if not usuario_atual.admin_unidade:
            if id != usuario_atual.id and not await self._repo.pertence_a_escopo(
                usuario_atual.unidade_id,
                id,
                tuple(dict.fromkeys((*usuario_atual.times_gerenciados, *usuario_atual.time_ids))),
            ):
                raise NotFoundException(f"Usuário {id} não encontrado.")
        return to_response(await self._obter_entidade(usuario_atual.unidade_id, id))

    async def criar(
        self, usuario_atual: UsuarioAutenticado, request: CriarUsuarioRequest
    ) -> UsuarioResponse:
        self._exigir_permissao(usuario_atual, "usuarios.gerenciar")
        await self._garantir_email_unico(request.email, None)
        usuario = Usuario(usuario_atual.unidade_id, request.nome, request.email)
        usuario.created_at = datetime.now()
        await self._repo.adicionar(usuario)
        await self._uow.commit()
        return to_response(usuario)

    async def atualizar(
        self, usuario_atual: UsuarioAutenticado, id: UUID, request: AtualizarUsuarioRequest
    ) -> UsuarioResponse:
        self._exigir_permissao(usuario_atual, "usuarios.gerenciar")
        usuario = await self._obter_entidade(usuario_atual.unidade_id, id)
        if Usuario.normalizar_email(request.email) != usuario.email:
            await self._garantir_email_unico(request.email, id)
        usuario.atualizar(request.nome, request.email)
        usuario.auth_version += 1
        await self._repo.atualizar(usuario)
        await self._uow.commit()
        return to_response(usuario)

    async def ativar(self, usuario_atual: UsuarioAutenticado, id: UUID) -> None:
        self._exigir_permissao(usuario_atual, "usuarios.gerenciar")
        usuario = await self._obter_entidade(usuario_atual.unidade_id, id)
        usuario.ativar()
        usuario.auth_version += 1
        await self._repo.atualizar(usuario)
        await self._uow.commit()

    async def inativar(self, usuario_atual: UsuarioAutenticado, id: UUID) -> None:
        self._exigir_permissao(usuario_atual, "usuarios.gerenciar")
        usuario = await self._obter_entidade(usuario_atual.unidade_id, id)
        usuario.inativar()
        usuario.auth_version += 1
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

    @staticmethod
    def _exigir_permissao(usuario_atual: UsuarioAutenticado, permissao: str) -> None:
        if not usuario_atual.pode(permissao):
            raise ForbiddenException("Você não tem permissão para realizar esta operação.")
