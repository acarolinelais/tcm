from uuid import UUID

from src.application.schemas.setor import (
    AtualizarSetorRequest,
    CriarSetorRequest,
    SetorGerenteResponse,
    SetorResponse,
    to_response,
)
from src.domain.common.exceptions import ConflictException, ForbiddenException, NotFoundException
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.interfaces.setor_gerente_repository import SetorGerenteRepository
from src.domain.entities.interfaces.setor_repository import SetorRepository
from src.domain.entities.interfaces.unit_of_work import UnitOfWork
from src.domain.entities.interfaces.usuario_repository import UsuarioRepository
from src.domain.entities.setor import Setor
from src.domain.entities.setor_gerente import SetorGerente


class SetorServiceImpl:
    def __init__(
        self,
        repo: SetorRepository,
        uow: UnitOfWork,
        gerente_repo: SetorGerenteRepository | None = None,
        usuario_repo: UsuarioRepository | None = None,
    ) -> None:
        self._repo = repo
        self._uow = uow
        self._gerente_repo = gerente_repo
        self._usuario_repo = usuario_repo

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
        self,
        usuario_atual: UsuarioAutenticado,
        page: int,
        page_size: int,
        ativo: bool | None = None,
        busca: str | None = None,
    ) -> PagedResult[SetorResponse]:
        setor_ids = None
        if not usuario_atual.eh_administrador:
            if usuario_atual.perfil_codigo != "GERENTE":
                raise ForbiddenException("Você não tem permissão para consultar setores.")
            setor_ids = usuario_atual.setores_gerenciados
        if setor_ids is None and ativo is None and busca is None:
            result = await self._repo.listar_paginado(usuario_atual.unidade_id, page, page_size)
        else:
            result = await self._repo.listar_paginado(
                usuario_atual.unidade_id,
                page,
                page_size,
                ativo=ativo,
                busca=busca,
                setor_ids=setor_ids,
            )
        return result.map(to_response)

    async def atualizar(
        self, usuario_atual: UsuarioAutenticado, setor_id: UUID, request: AtualizarSetorRequest
    ) -> SetorResponse:
        self._exigir_admin(usuario_atual)
        setor = await self._obter_setor(usuario_atual.unidade_id, setor_id)
        if request.nome is not None:
            setor.nome = request.nome.strip()
        if request.ativo is False and setor.ativo:
            if await self._repo.possui_times_ativos(usuario_atual.unidade_id, setor_id):
                raise ConflictException(
                    "Inative ou remova os times ativos antes de inativar o setor."
                )
            setor.inativar()
            if self._gerente_repo:
                ids = await self._gerente_repo.inativar_por_setor(
                    usuario_atual.unidade_id, setor_id
                )
                if self._usuario_repo:
                    for usuario_id in ids:
                        await self._usuario_repo.invalidar_sessoes(usuario_id)
        elif request.ativo is True:
            setor.ativar()
        await self._repo.atualizar(setor)
        await self._uow.commit()
        return to_response(setor)

    async def listar_gerentes(
        self, usuario_atual: UsuarioAutenticado, setor_id: UUID
    ) -> list[SetorGerenteResponse]:
        self._exigir_admin(usuario_atual)
        await self._obter_setor(usuario_atual.unidade_id, setor_id)
        if not self._gerente_repo:
            return []
        return [
            SetorGerenteResponse(setor_id=a.setor_id, usuario_id=a.usuario_id, ativo=a.ativo)
            for a in await self._gerente_repo.listar_gerentes(usuario_atual.unidade_id, setor_id)
        ]

    async def associar_gerente(
        self, usuario_atual: UsuarioAutenticado, setor_id: UUID, gerente_id: UUID
    ) -> SetorGerenteResponse:
        self._exigir_admin(usuario_atual)
        setor = await self._obter_setor(usuario_atual.unidade_id, setor_id)
        if not setor.ativo:
            raise ConflictException("Não é possível associar gerente a um setor inativo.")
        if not self._gerente_repo or not self._usuario_repo:
            raise RuntimeError("Repositórios de associação não configurados.")
        if not await self._usuario_repo.gerente_ativo_na_unidade(
            usuario_atual.unidade_id, gerente_id
        ):
            raise NotFoundException(
                "Usuário ativo com perfil Gerente não encontrado nesta unidade."
            )
        assoc = await self._gerente_repo.obter(usuario_atual.unidade_id, setor_id, gerente_id)
        if assoc is None:
            assoc = SetorGerente(usuario_atual.unidade_id, setor_id, gerente_id)
            await self._gerente_repo.adicionar(assoc)
        elif not assoc.ativo:
            assoc.ativar()
            await self._gerente_repo.atualizar(assoc)
        else:
            raise ConflictException("Este gerente já está associado ao setor.")
        await self._usuario_repo.invalidar_sessoes(gerente_id)
        await self._uow.commit()
        return SetorGerenteResponse(setor_id=setor_id, usuario_id=gerente_id, ativo=True)

    async def desassociar_gerente(
        self, usuario_atual: UsuarioAutenticado, setor_id: UUID, gerente_id: UUID
    ) -> None:
        self._exigir_admin(usuario_atual)
        if not self._gerente_repo or not self._usuario_repo:
            raise RuntimeError("Repositórios de associação não configurados.")
        assoc = await self._gerente_repo.obter(usuario_atual.unidade_id, setor_id, gerente_id)
        if assoc is None:
            raise NotFoundException("Associação não encontrada.")
        if assoc.ativo:
            assoc.inativar()
            await self._gerente_repo.atualizar(assoc)
            await self._usuario_repo.invalidar_sessoes(gerente_id)
            await self._uow.commit()

    async def _obter_setor(self, unidade_id: UUID, setor_id: UUID) -> Setor:
        setor = await self._repo.obter_por_id(unidade_id, setor_id)
        if setor is None:
            raise NotFoundException("Setor não encontrado.")
        return setor

    @staticmethod
    def _exigir_admin(usuario_atual: UsuarioAutenticado) -> None:
        if not usuario_atual.eh_administrador:
            raise ForbiddenException("Apenas administradores da unidade podem gerenciar setores.")
