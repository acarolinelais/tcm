from datetime import UTC, datetime
from uuid import UUID

from src.application.schemas.modelo_dispositivo import (
    AtualizarModeloDispositivoRequest,
    CriarModeloDispositivoRequest,
    ModeloDispositivoOpcaoResponse,
    ModeloDispositivoResponse,
    to_opcao_response,
    to_response,
)
from src.domain.common.exceptions import ConflictException, ForbiddenException, NotFoundException
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.interfaces.modelo_dispositivo_repository import (
    ModeloDispositivoRepository,
)
from src.domain.entities.interfaces.unit_of_work import UnitOfWork
from src.domain.entities.modelo_dispositivo import ModeloDispositivo

PERMISSAO_GERENCIAR = "modelos_dispositivo.gerenciar"


class ModeloDispositivoServiceImpl:
    def __init__(self, repo: ModeloDispositivoRepository, uow: UnitOfWork) -> None:
        self._repo = repo
        self._uow = uow

    async def listar(
        self,
        usuario_atual: UsuarioAutenticado,
        page: int,
        page_size: int,
        ativo: bool | None = None,
        busca: str | None = None,
    ) -> PagedResult[ModeloDispositivoResponse]:
        self._exigir_permissao(usuario_atual, PERMISSAO_GERENCIAR)
        modelos = await self._repo.listar_paginado(
            usuario_atual.unidade_id, page, page_size, ativo, busca
        )
        return modelos.map(to_response)

    async def listar_opcoes(
        self,
        usuario_atual: UsuarioAutenticado,
        page: int,
        page_size: int,
        busca: str | None = None,
    ) -> PagedResult[ModeloDispositivoOpcaoResponse]:
        """Modelos ativos para o seletor de projetos, sem exigir a gestão do catálogo."""
        self._exigir_permissao(usuario_atual, PERMISSAO_GERENCIAR, "projetos.gerenciar")
        modelos = await self._repo.listar_paginado(
            usuario_atual.unidade_id, page, page_size, True, busca
        )
        return modelos.map(to_opcao_response)

    async def criar(
        self, usuario_atual: UsuarioAutenticado, request: CriarModeloDispositivoRequest
    ) -> ModeloDispositivoResponse:
        self._exigir_permissao(usuario_atual, PERMISSAO_GERENCIAR)
        if await self._repo.existe_nome(usuario_atual.unidade_id, request.nome, None):
            raise ConflictException("Já existe um modelo de dispositivo com este nome.")
        modelo = ModeloDispositivo(usuario_atual.unidade_id, request.nome, request.descricao)
        modelo.created_at = modelo.updated_at = _agora()
        await self._repo.adicionar(modelo)
        await self._uow.commit()
        return to_response(modelo)

    async def atualizar(
        self,
        usuario_atual: UsuarioAutenticado,
        modelo_id: UUID,
        request: AtualizarModeloDispositivoRequest,
    ) -> ModeloDispositivoResponse:
        self._exigir_permissao(usuario_atual, PERMISSAO_GERENCIAR)
        modelo = await self._repo.obter_por_id(usuario_atual.unidade_id, modelo_id)
        if modelo is None:
            raise NotFoundException("Modelo de dispositivo não encontrado.")
        if request.nome is not None:
            if await self._repo.existe_nome(usuario_atual.unidade_id, request.nome, modelo_id):
                raise ConflictException("Já existe um modelo de dispositivo com este nome.")
            modelo.atualizar_nome(request.nome)
        if "descricao" in request.model_fields_set:
            modelo.atualizar_descricao(request.descricao)
        if request.ativo is True:
            modelo.ativar()
        elif request.ativo is False:
            modelo.inativar()
        modelo.updated_at = _agora()
        await self._repo.atualizar(modelo)
        await self._uow.commit()
        return to_response(modelo)

    @staticmethod
    def _exigir_permissao(usuario_atual: UsuarioAutenticado, *permissoes: str) -> None:
        if not any(usuario_atual.pode(permissao) for permissao in permissoes):
            raise ForbiddenException(
                "Você não tem permissão para gerenciar modelos de dispositivo."
            )


def _agora() -> datetime:
    # Sem fuso, em UTC: o mesmo valor que o now() do Postgres grava nas colunas `timestamp`.
    return datetime.now(UTC).replace(tzinfo=None)
